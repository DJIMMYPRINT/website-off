import crypto from 'crypto'
import { buildReply } from '../../../lib/autoreply'
import {
  accountFor, matchCampaign, publicReplyFor, dmFor, buildBrandReply,
} from '../../../lib/campaigns'

// Webhook Meta — un seul endpoint pour tous les comptes et tous les canaux.
//
//   GET  /api/social/webhook   vérification de l'abonnement (hub.challenge)
//   POST /api/social/webhook   deux automatismes :
//        • message privé reçu  -> réponse automatique (Messenger, Instagram, WhatsApp)
//        • commentaire reçu    -> réponse publique + message privé de campagne
//
// Le compte destinataire est reconnu par `entry.id` (voir lib/campaigns.js) :
// Djimmy Prints et la marque personnelle partagent ce déploiement mais ont
// leurs propres jetons, leurs propres campagnes et leur propre ton.
//
// Configuration : voir docs/AUTO-REPONSES.md. Sans variables d'environnement
// l'endpoint reste inerte (il répond 200 et log ce qu'il aurait envoyé), donc
// le déployer ne change rien tant que l'application Meta n'est pas branchée.

// Raw body needed for the X-Hub-Signature-256 check: JSON.parse then
// re-stringify does not round-trip byte for byte, and the HMAC is computed
// over the exact bytes Meta sent.
export const config = { api: { bodyParser: false } }

const GRAPH = `https://graph.facebook.com/${process.env.META_GRAPH_VERSION || 'v21.0'}`

const VERIFY_TOKEN = (process.env.META_VERIFY_TOKEN || '').trim()
const APP_SECRET = (process.env.META_APP_SECRET || '').trim()
const WA_TOKEN = (process.env.WHATSAPP_TOKEN || '').trim()
const WA_PHONE_ID = (process.env.WHATSAPP_PHONE_ID || '').trim()

// Interrupteur général : AUTOREPLY_ENABLED=false coupe tout sans redéployer.
// COMMENT_PUBLIC_REPLY=false garde le DM mais arrête de répondre en public.
const ENABLED = (process.env.AUTOREPLY_ENABLED || 'true').toLowerCase() !== 'false'
const PUBLIC_REPLY = (process.env.COMMENT_PUBLIC_REPLY || 'true').toLowerCase() !== 'false'

/* ─────────────────────────── garde-fous mémoire ───────────────────────── */

// Best effort only: on Vercel each serverless instance has its own memory, so
// a retry that lands on a cold instance can slip through. Meta's own rule —
// one private reply per comment, ever — is the real safety net for campaigns.
const seen = new Map()   // message / comment id -> timestamp
const sent = new Map()   // sender id -> [timestamps]
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
 * Aplatit une charge utile Meta en une liste d'événements exploitables :
 * messages privés reçus et commentaires ajoutés. Tout le reste (accusés de
 * lecture, livraisons, réactions, commentaires supprimés, échos de nos
 * propres messages) est ignoré.
 */
export function extractEvents(payload) {
  const out = []
  const object = payload?.object

  for (const entry of payload?.entry || []) {
    const accountId = String(entry.id || '')

    // ── Messages privés : Messenger et Instagram partagent cette forme.
    for (const m of entry.messaging || []) {
      if (!m.message || m.message.is_echo || !m.message.text) continue
      out.push({
        kind: 'message',
        channel: object === 'instagram' ? 'instagram' : 'messenger',
        accountId,
        senderId: m.sender?.id,
        mid: m.message.mid,
        text: m.message.text,
      })
    }

    for (const change of entry.changes || []) {
      const v = change.value || {}

      // ── Commentaires Instagram.
      if (change.field === 'comments' && v.id) {
        out.push({
          kind: 'comment',
          channel: 'instagram',
          accountId,
          commentId: String(v.id),
          mediaId: String(v.media?.id || ''),
          fromId: String(v.from?.id || v.sender_id || ''),
          fromName: v.from?.username || '',
          text: v.text || '',
        })
        continue
      }

      // ── Commentaires Facebook (fil de la Page).
      if (change.field === 'feed' && v.item === 'comment' && v.verb === 'add') {
        out.push({
          kind: 'comment',
          channel: 'facebook',
          accountId,
          commentId: String(v.comment_id || ''),
          mediaId: String(v.post_id || ''),
          fromId: String(v.from?.id || ''),
          fromName: v.from?.name || '',
          text: v.message || '',
        })
        continue
      }

      // ── Messages WhatsApp Cloud API.
      for (const m of v.messages || []) {
        if (m.type !== 'text') continue
        out.push({
          kind: 'message',
          channel: 'whatsapp',
          accountId,
          senderId: m.from,
          mid: m.id,
          text: m.text?.body,
          phoneId: v.metadata?.phone_number_id || WA_PHONE_ID,
        })
      }
    }
  }

  return out.filter(e => e.text && (e.kind === 'comment' ? e.commentId : e.senderId))
}

/* ──────────────────────────────── sortie ──────────────────────────────── */

async function graph(path, body, token) {
  const res = await fetch(`${GRAPH}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  const raw = await res.text()
  if (!res.ok) throw new Error(`${path} -> ${res.status} ${raw.slice(0, 300)}`)
  return raw
}

/** Message privé dans une conversation déjà ouverte (le client a écrit). */
async function sendMessage(account, evt, text) {
  if (evt.channel === 'whatsapp') {
    const phoneId = evt.phoneId || WA_PHONE_ID
    if (!WA_TOKEN || !phoneId) return { sent: false, reason: 'whatsapp non configuré' }
    await graph(`${phoneId}/messages`, {
      messaging_product: 'whatsapp',
      to: evt.senderId,
      type: 'text',
      text: { body: text, preview_url: false },
    }, WA_TOKEN)
    return { sent: true }
  }

  if (!account.token) return { sent: false, reason: `${account.label} : jeton absent` }
  await graph('me/messages', {
    recipient: { id: evt.senderId },
    messaging_type: 'RESPONSE',
    message: { text },
  }, account.token)
  return { sent: true }
}

/**
 * Réponse privée à un commentaire (« private reply »).
 * Meta n'en autorise qu'une seule par commentaire, dans les 7 jours — d'où
 * l'envoi des différentes parties d'une campagne en un seul message.
 */
async function sendPrivateReply(account, evt, text) {
  if (!account.token) return { sent: false, reason: `${account.label} : jeton absent` }
  if (evt.channel === 'instagram') {
    await graph(`${evt.accountId}/messages`, {
      recipient: { comment_id: evt.commentId },
      message: { text },
    }, account.token)
  } else {
    await graph(`${evt.commentId}/private_replies`, { message: text }, account.token)
  }
  return { sent: true }
}

/** Réponse publique, sous le commentaire du visiteur. */
async function sendPublicReply(account, evt, text) {
  if (!account.token) return { sent: false, reason: `${account.label} : jeton absent` }
  const path = evt.channel === 'instagram'
    ? `${evt.commentId}/replies`
    : `${evt.commentId}/comments`
  await graph(path, { message: text }, account.token)
  return { sent: true }
}

/* ────────────────────────────── traitement ────────────────────────────── */

async function handleMessage(account, evt) {
  const reply = account.brain === 'brand'
    ? buildBrandReply(evt.text, { accountKey: account.key, name: evt.fromName })
    : buildReply(evt.text, { channel: evt.channel })

  console.log(`[social] ${account.key}/${evt.channel} ${evt.senderId} « ${evt.text.slice(0, 80)} » -> ${reply.intent}${reply.handoff ? ' (à reprendre)' : ''}`)

  // Une campagne peut répondre en plusieurs messages : ici la conversation
  // est ouverte, donc rien n'empêche de les envoyer à la suite.
  const parts = reply.campaign
    ? dmFor(reply.campaign, { name: evt.fromName })
    : [reply.text]

  let out = { sent: false, reason: 'aucun message' }
  for (const part of parts) {
    out = await sendMessage(account, evt, part)
    if (!out.sent) break
  }
  if (!out.sent) console.log(`[social] non envoyé (${out.reason}) :\n${reply.text}`)
  return { intent: reply.intent, handoff: reply.handoff, ...out }
}

async function handleComment(account, evt) {
  // Ne jamais réagir à nos propres commentaires : la réponse publique que
  // nous venons de publier revient elle aussi par le webhook.
  if (evt.fromId && (evt.fromId === evt.accountId || account.ids.includes(evt.fromId))) {
    return { skipped: 'commentaire du compte' }
  }

  const campaign = matchCampaign({
    accountKey: account.key,
    mediaId: evt.mediaId,
    text: evt.text,
  })

  if (!campaign) {
    // Un commentaire ordinaire n'est pas une demande : on le laisse à
    // l'humain plutôt que de répondre à côté sous une publication publique.
    // L'identifiant de publication est logué ici : c'est ainsi qu'on le
    // récupère pour cibler une campagne sur une seule vidéo (media: [...]).
    console.log(`[social] ${account.key}/${evt.channel} commentaire sans mot-clé « ${evt.text.slice(0, 60)} » (publication ${evt.mediaId || '?'})`)
    return { skipped: 'aucune campagne' }
  }

  const ctx = { name: evt.fromName, commentId: evt.commentId }
  // Un seul message privé autorisé par commentaire : on assemble.
  const dm = dmFor(campaign, ctx).join('\n\n')
  const result = { campaign: campaign.id }

  try {
    const priv = await sendPrivateReply(account, evt, dm)
    result.dm = priv.sent ? 'envoyé' : `non envoyé (${priv.reason})`
    if (!priv.sent) console.log(`[social] DM campagne non envoyé (${priv.reason}) :\n${dm}`)
  } catch (err) {
    // Une réponse publique promettant un DM qui n'est jamais parti est pire
    // que pas de réponse du tout : on n'enchaîne pas si le privé a échoué.
    console.error(`[social] DM campagne ${campaign.id} :`, err.message)
    return { ...result, dm: 'échec', publicReply: 'annulée' }
  }

  if (PUBLIC_REPLY) {
    const text = publicReplyFor(campaign, ctx)
    if (text) {
      try {
        const pub = await sendPublicReply(account, evt, text)
        result.publicReply = pub.sent ? text : `non envoyée (${pub.reason})`
      } catch (err) {
        console.error(`[social] réponse publique ${campaign.id} :`, err.message)
        result.publicReply = 'échec'
      }
    }
  }

  console.log(`[social] ${account.key}/${evt.channel} campagne ${campaign.id} <- « ${evt.text.slice(0, 60)} » (${evt.fromName || evt.fromId})`)
  return result
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
    for (const evt of extractEvents(payload)) {
      const id = evt.kind === 'comment' ? evt.commentId : evt.mid
      const who = evt.kind === 'comment' ? evt.fromId : evt.senderId
      if (alreadyHandled(id)) { results.push({ id, skipped: 'doublon' }); continue }
      if (!ENABLED) { results.push({ id, skipped: 'désactivé' }); continue }
      if (who && rateLimited(who)) { results.push({ id, skipped: 'quota' }); continue }

      const account = accountFor(evt.accountId)
      const out = evt.kind === 'comment'
        ? await handleComment(account, evt)
        : await handleMessage(account, evt)
      results.push({ id, kind: evt.kind, account: account.key, channel: evt.channel, ...out })
    }
  } catch (err) {
    // Meta réessaie tant qu'on ne répond pas 200 : on log et on acquitte,
    // sinon une erreur Graph fait boucler la livraison du même événement.
    console.error('[social]', err)
  }

  return res.status(200).json({ ok: true, handled: results })
}
