import {
  metaConfigured, verifyConfigured, dryRun, verifySignature, verifyToken,
  extractEvents, isOwnEvent, sendDirectMessage, replyToComment, privateReplyToComment,
} from '../../../lib/meta'
import { buildReply } from '../../../lib/autoreply'

// Webhook Meta : messages privés et commentaires Instagram / Facebook.
//
// GET  /api/social/webhook?hub.mode=subscribe&hub.verify_token=…&hub.challenge=…
//      → vérification de l'abonnement au moment où vous branchez le webhook
//        dans le tableau de bord Meta.
// GET  /api/social/webhook
//      → état de la configuration (booléens uniquement, aucun secret) —
//        c'est ce que lit la console /auto-reponses.
// POST /api/social/webhook
//      → un évènement. On répond 200 le plus vite possible : au-delà de
//        quelques secondes Meta considère la livraison échouée et rejoue
//        l'évènement, ce qui ferait répondre deux fois.
//
// Ce que le robot ne fait jamais : parler à la place du patron sur un sujet
// qu'il ne connaît pas. Toutes les réponses viennent de lib/autoreply.js et
// renvoient vers WhatsApp.

export const config = { api: { bodyParser: false } }

const BUILD = (process.env.VERCEL_GIT_COMMIT_SHA || 'local').slice(0, 7)

// Meta rejoue un évènement tant qu'il n'a pas reçu de 200 — et rejoue
// parfois même après. Le cache mémoire dédoublonne à l'échelle d'une
// instance : ce n'est pas une garantie absolue en serverless (plusieurs
// instances peuvent tourner), mais cela couvre le cas courant, qui est la
// relivraison rapprochée.
const SEEN = new Map()
const SEEN_TTL = 15 * 60 * 1000
// Garde-fou anti-boucle : deux robots qui se répondent, ça arrive. Un même
// interlocuteur ne reçoit pas plus d'une réponse automatique par minute.
const COOLDOWN = 60 * 1000
const LAST_REPLY = new Map()

function sweep(map, ttl) {
  const now = Date.now()
  for (const [k, t] of map) if (now - t > ttl) map.delete(k)
  // Ceinture et bretelles : une instance longue durée ne doit pas grossir
  // indéfiniment si le trafic dépasse ce que le TTL nettoie.
  if (map.size > 2000) for (const k of map.keys()) { map.delete(k); if (map.size <= 1000) break }
}

function firstTime(map, key, ttl) {
  if (!key) return true
  sweep(map, ttl)
  const now = Date.now()
  const prev = map.get(key)
  if (prev && now - prev < ttl) return false
  map.set(key, now)
  return true
}

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (c) => {
      size += c.length
      // Une charge utile Meta pèse quelques kilo-octets ; au-delà, ce n'en
      // est pas une.
      if (size > 1024 * 1024) { reject(new Error('payload trop volumineux')); req.destroy(); return }
      chunks.push(c)
    })
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const mode = req.query['hub.mode']
    const challenge = req.query['hub.challenge']

    // Poignée de main Meta.
    if (mode === 'subscribe') {
      if (!verifyConfigured) return res.status(503).send('META_VERIFY_TOKEN absent')
      if (!verifyToken(req.query['hub.verify_token'])) return res.status(403).send('Jeton invalide')
      return res.status(200).send(String(challenge || ''))
    }

    // État de la configuration : que des booléens, jamais une valeur.
    return res.status(200).json({
      build: BUILD,
      verifyTokenSet: verifyConfigured,
      configured: metaConfigured,
      dryRun,
      mode: !metaConfigured ? 'inactif' : dryRun ? 'simulation' : 'actif',
    })
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ error: 'Méthode non autorisée.' })
  }

  let raw
  try {
    raw = await readRawBody(req)
  } catch (err) {
    return res.status(413).json({ error: 'Corps de requête invalide.' })
  }

  // Sans secret d'application, impossible de distinguer Meta d'un inconnu :
  // on refuse plutôt que de faire écrire la page par le premier venu.
  if (!metaConfigured) {
    console.warn('[social] webhook reçu mais non configuré (META_APP_SECRET / META_PAGE_ACCESS_TOKEN)')
    return res.status(503).json({ configured: false, build: BUILD })
  }
  if (!verifySignature(raw, req.headers['x-hub-signature-256'])) {
    console.warn('[social] signature invalide — évènement ignoré')
    return res.status(401).json({ error: 'Signature invalide.' })
  }

  let body
  try {
    body = JSON.parse(raw.toString('utf8'))
  } catch {
    return res.status(400).json({ error: 'JSON invalide.' })
  }

  const entryIds = (Array.isArray(body.entry) ? body.entry : []).map(e => String(e.id || ''))
  const events = extractEvents(body)
  let handled = 0

  for (const ev of events) {
    try {
      if (isOwnEvent(ev, entryIds[0])) continue
      if (!firstTime(SEEN, ev.eventId, SEEN_TTL)) continue

      const reply = buildReply(ev.text, { channel: ev.kind, name: ev.name })
      if (reply.skipped) {
        console.log(`[social] ${ev.platform}/${ev.kind} sans contenu exploitable — pas de réponse`)
        continue
      }

      const target = ev.kind === 'dm' ? ev.senderId : ev.commentId
      if (!firstTime(LAST_REPLY, `${ev.kind}:${ev.fromId || target}`, COOLDOWN)) {
        console.log(`[social] ${ev.platform}/${ev.kind} ignoré (délai anti-boucle)`)
        continue
      }

      if (ev.kind === 'dm') {
        if (!ev.senderId) continue
        await sendDirectMessage(ev.senderId, reply.text)
      } else {
        if (!ev.commentId) continue
        await replyToComment(ev.commentId, reply.text, ev.platform)
        // Puis le message privé, plus complet. Meta n'autorise qu'une seule
        // réponse privée par commentaire et la refuse si l'auteur n'a jamais
        // écrit à la page : l'échec est normal, il ne doit rien interrompre.
        try {
          const dm = buildReply(ev.text, { channel: 'dm', name: ev.name })
          await privateReplyToComment(ev.commentId, dm.text)
        } catch (err) {
          console.log('[social] réponse privée refusée —', err.metaCode || err.message)
        }
      }

      handled++
      console.log(`[social] ${ev.platform}/${ev.kind} → intention « ${reply.intent} »${dryRun ? ' (simulation)' : ''}`)
    } catch (err) {
      // Un évènement raté ne doit ni faire échouer les autres, ni provoquer
      // une relivraison de tout le lot.
      console.error('[social]', err.metaCode || '', err.message)
    }
  }

  return res.status(200).json({ received: events.length, handled, dryRun, build: BUILD })
}
