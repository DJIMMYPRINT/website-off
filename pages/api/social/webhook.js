import crypto from 'crypto'
import { buildReply } from '../../../lib/autoreply'

// Webhook Meta — un seul endpoint pour Messenger, Instagram DM et WhatsApp.
//
//   GET  /api/social/webhook   vérification de l'abonnement (hub.challenge)
//   POST /api/social/webhook   messages entrants -> réponse automatique
//
// Configuration : voir docs/AUTO-REPONSES.md. Sans variables d'environnement
// l'endpoint reste inerte (il répond 200 et log ce qu'il aurait envoyé), donc
// le déployer ne change rien tant que vous n'avez pas branché l'application
// Meta — exactement comme /api/orders sans clé Supabase.

// Raw body needed for the X-Hub-Signature-256 check: JSON.parse then
// re-stringify does not round-trip byte for byte, and the HMAC is computed
// over the exact bytes Meta sent.
export const config = { api: { bodyParser: false } }

const GRAPH = `https://graph.facebook.com/${process.env.META_GRAPH_VERSION || 'v21.0'}`

const VERIFY_TOKEN = (process.env.META_VERIFY_TOKEN || '').trim()
const APP_SECRET = (process.env.META_APP_SECRET || '').trim()
const PAGE_TOKEN = (process.env.META_PAGE_TOKEN || '').trim()          // Messenger + Instagram
const IG_TOKEN = (process.env.META_IG_TOKEN || '').trim() || PAGE_TOKEN // si compte IG séparé
const WA_TOKEN = (process.env.WHATSAPP_TOKEN || '').trim()
const WA_PHONE_ID = (process.env.WHATSAPP_PHONE_ID || '').trim()

// Interrupteur général : mettre AUTOREPLY_ENABLED=false coupe les réponses
// sans redéployer le code (utile pendant une campagne, ou en cas d'abus).
const ENABLED = (process.env.AUTOREPLY_ENABLED || 'true').toLowerCase() !== 'false'

/* ─────────────────────────── garde-fous mémoire ───────────────────────── */

// Best effort only: on Vercel each serverless instance has its own memory, so
// a retry that lands on a cold instance can slip through. The signature
// check, the echo filter and Meta's own dedup make that rare, and the cost of
// a duplicate reply is one extra message — not a loop.
const seen = new Map()   // message id -> timestamp
const sent = new Map()   // sender id  -> [timestamps]
const SEEN_TTL = 10 * 60_000
const RATE_MAX = 12      // réponses max par interlocuteur et par heure

function alreadyHandled(id) {
  if (!id) return false
  const now = Date.now()
  for (const [k, t] of seen) if (now - t > SEEN_TTL) seen.delete(k)
  if (seen.has(id)) return true
  seen.set(id, now)
  return false
}

function rateLimited(senderId) {
  const now = Date.now()
  const hits = (sent.get(senderId) || []).filter(t => now - t < 3_600_000)
  if (hits.length >= RATE_MAX) return true
  hits.push(now)
  sent.set(senderId, hits)
  return false
}

/* ──────────────────────────────── entrée ──────────────────────────────── */

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', c => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

function signatureValid(raw, header) {
  if (!APP_SECRET) return true // non configuré : on n'exige pas la signature
  const expected = 'sha256=' + crypto.createHmac('sha256', APP_SECRET).update(raw).digest('hex')
  const got = String(header || '')
  if (got.length !== expected.length) return false
  return crypto.timingSafeEqual(Buffer.from(got), Buffer.from(expected))
}

/**
 * Aplatit une charge utile Meta en une liste de messages texte entrants.
 * Tout le reste (accusés de lecture, livraisons, réactions, pièces jointes
 * seules, échos de nos propres messages) est ignoré.
 */
export function extractMessages(payload) {
  const out = []
  const object = payload?.object

  for (const entry of payload?.entry || []) {
    // Messenger et Instagram : même forme.
    for (const m of entry.messaging || []) {
      if (!m.message || m.message.is_echo) continue
      const text = m.message.text
      if (!text) continue
      out.push({
        channel: object === 'instagram' ? 'instagram' : 'messenger',
        senderId: m.sender?.id,
        mid: m.message.mid,
        text,
      })
    }

    // WhatsApp Cloud API.
    for (const change of entry.changes || []) {
      const value = change.value || {}
      for (const m of value.messages || []) {
        if (m.type !== 'text') continue
        out.push({
          channel: 'whatsapp',
          senderId: m.from,
          mid: m.id,
          text: m.text?.body,
          phoneId: value.metadata?.phone_number_id || WA_PHONE_ID,
        })
      }
    }
  }
  return out.filter(m => m.senderId && m.text)
}

/* ──────────────────────────────── sortie ──────────────────────────────── */

async function graph(url, body, token) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  const raw = await res.text()
  if (!res.ok) throw new Error(`${res.status} ${raw.slice(0, 300)}`)
  return raw
}

async function sendReply(msg, text) {
  if (msg.channel === 'whatsapp') {
    const phoneId = msg.phoneId || WA_PHONE_ID
    if (!WA_TOKEN || !phoneId) return { sent: false, reason: 'whatsapp non configuré' }
    await graph(`${GRAPH}/${phoneId}/messages`, {
      messaging_product: 'whatsapp',
      to: msg.senderId,
      type: 'text',
      text: { body: text, preview_url: false },
    }, WA_TOKEN)
    return { sent: true }
  }

  const token = msg.channel === 'instagram' ? IG_TOKEN : PAGE_TOKEN
  if (!token) return { sent: false, reason: `${msg.channel} non configuré` }
  await graph(`${GRAPH}/me/messages`, {
    recipient: { id: msg.senderId },
    messaging_type: 'RESPONSE',
    message: { text },
  }, token)
  return { sent: true }
}

/* ─────────────────────────────── handler ──────────────────────────────── */

export default async function handler(req, res) {
  // 1. Vérification de l'abonnement, une seule fois, depuis le tableau de
  //    bord Meta : il rappelle cette URL avec le token choisi.
  if (req.method === 'GET') {
    const mode = req.query['hub.mode']
    const token = req.query['hub.verify_token']
    const challenge = req.query['hub.challenge']
    if (mode === 'subscribe' && VERIFY_TOKEN && token === VERIFY_TOKEN) {
      return res.status(200).send(challenge)
    }
    return res.status(403).json({ error: 'Vérification refusée.' })
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ error: 'Méthode non autorisée.' })
  }

  const raw = await readRawBody(req)
  if (!signatureValid(raw, req.headers['x-hub-signature-256'])) {
    console.warn('[social] signature invalide')
    return res.status(403).json({ error: 'Signature invalide.' })
  }

  let payload
  try {
    payload = JSON.parse(raw.toString('utf8') || '{}')
  } catch {
    return res.status(400).json({ error: 'Charge utile illisible.' })
  }

  const results = []
  try {
    for (const msg of extractMessages(payload)) {
      if (alreadyHandled(msg.mid)) { results.push({ mid: msg.mid, skipped: 'doublon' }); continue }
      if (!ENABLED) { results.push({ mid: msg.mid, skipped: 'désactivé' }); continue }
      if (rateLimited(msg.senderId)) { results.push({ mid: msg.mid, skipped: 'quota' }); continue }

      const reply = buildReply(msg.text, { channel: msg.channel })
      // Le log est la trace de ce que le bot a répondu, et le mode d'emploi
      // quand rien n'est configuré : il montre la réponse sans l'envoyer.
      console.log(`[social] ${msg.channel} ${msg.senderId} « ${msg.text.slice(0, 80)} » -> ${reply.intent}${reply.handoff ? ' (à reprendre)' : ''}`)
      const out = await sendReply(msg, reply.text)
      if (!out.sent) console.log(`[social] non envoyé (${out.reason}) :\n${reply.text}`)
      results.push({ mid: msg.mid, channel: msg.channel, intent: reply.intent, handoff: reply.handoff, ...out })
    }
  } catch (err) {
    // Meta réessaie tant qu'on ne répond pas 200 : on log et on acquitte,
    // sinon une erreur Graph fait boucler la livraison du même message.
    console.error('[social]', err)
  }

  return res.status(200).json({ ok: true, handled: results })
}
