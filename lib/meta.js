// Accès à l'API Graph de Meta (Instagram + Facebook Page) côté serveur.
//
// Trois principes, les mêmes que lib/db.js :
//
//  1. Aucun jeton ne part vers le navigateur. Tout ce qui est ici tourne
//     uniquement dans pages/api/. Jamais de préfixe NEXT_PUBLIC_.
//  2. Sans configuration, rien ne casse : `metaConfigured` passe à false et
//     le webhook répond « non configuré » au lieu de planter.
//  3. Rien n'est envoyé sans signature vérifiée. Un webhook public non
//     signé, c'est n'importe qui qui fait écrire votre page.
//
// Variables d'environnement (voir .env.example et le README §8) :
//   META_VERIFY_TOKEN       — chaîne inventée par vous, recopiée dans Meta
//   META_APP_SECRET         — Meta → App → Paramètres → Général
//   META_PAGE_ACCESS_TOKEN  — jeton de la Page (permanent de préférence)
//   META_PAGE_ID            — id de la Page Facebook (optionnel)
//   META_IG_ID              — id du compte Instagram pro (optionnel)
//   SOCIAL_AUTOREPLY        — 'off' = mode simulation (log, aucun envoi)

import crypto from 'crypto'

function clean(v) {
  return String(v || '').trim().replace(/^["']|["']$/g, '')
}

const GRAPH = `https://graph.facebook.com/${clean(process.env.META_GRAPH_VERSION) || 'v21.0'}`

export const VERIFY_TOKEN = clean(process.env.META_VERIFY_TOKEN)
const APP_SECRET = clean(process.env.META_APP_SECRET)
const PAGE_TOKEN = clean(process.env.META_PAGE_ACCESS_TOKEN)
export const PAGE_ID = clean(process.env.META_PAGE_ID)
export const IG_ID = clean(process.env.META_IG_ID)

/** Le webhook peut-il fonctionner ? (jeton d'envoi + secret de signature) */
export const metaConfigured = Boolean(PAGE_TOKEN && APP_SECRET)
export const verifyConfigured = Boolean(VERIFY_TOKEN)

/**
 * Mode simulation : les réponses sont calculées et tracées dans les logs,
 * mais rien n'est publié. C'est le mode dans lequel on branche le webhook la
 * première semaine, le temps de relire ce que le robot répondrait.
 */
export const dryRun = clean(process.env.SOCIAL_AUTOREPLY).toLowerCase() === 'off'

/**
 * Signature Meta (X-Hub-Signature-256) sur le corps *brut* de la requête.
 * Comparaison à temps constant : une comparaison naïve fuit l'information
 * octet par octet.
 */
export function verifySignature(rawBody, header) {
  if (!APP_SECRET) return false
  const sig = clean(header)
  if (!sig.startsWith('sha256=')) return false
  const expected = 'sha256=' + crypto.createHmac('sha256', APP_SECRET).update(rawBody).digest('hex')
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

/** Le token de vérification renvoyé par Meta correspond-il au nôtre ? */
export function verifyToken(candidate) {
  if (!VERIFY_TOKEN) return false
  const a = Buffer.from(clean(candidate))
  const b = Buffer.from(VERIFY_TOKEN)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

// ── Lecture des évènements ───────────────────────────────────────────────
//
// Instagram et Facebook envoient la même enveloppe (`entry[]`) avec deux
// formes utiles :
//   • entry[].messaging[]  → un message privé
//   • entry[].changes[]    → un commentaire (champ `comments` côté IG,
//                            `feed` avec item = 'comment' côté Facebook)
//
// Cette fonction est pure : elle est ce qu'on teste, le reste n'est que des
// appels réseau.

/**
 * @returns {Array<{kind:'dm'|'comment',platform:string,text:string,
 *   senderId:?string,commentId:?string,eventId:string,fromId:?string,
 *   name:?string,isEcho:boolean}>}
 */
export function extractEvents(body) {
  const out = []
  const entries = Array.isArray(body && body.entry) ? body.entry : []
  const platform = body && body.object === 'instagram' ? 'instagram' : 'facebook'

  for (const entry of entries) {
    for (const m of entry.messaging || []) {
      const text = (m.message && m.message.text) || ''
      out.push({
        kind: 'dm',
        platform,
        text,
        senderId: m.sender && m.sender.id ? String(m.sender.id) : null,
        commentId: null,
        // mid est l'identifiant du message : c'est lui qui rend les
        // relivraisons de Meta reconnaissables.
        eventId: (m.message && m.message.mid) || `${entry.id}:${m.timestamp || ''}`,
        fromId: m.sender && m.sender.id ? String(m.sender.id) : null,
        name: null,
        isEcho: Boolean(m.message && m.message.is_echo),
      })
    }

    for (const c of entry.changes || []) {
      const v = c.value || {}
      const isComment =
        c.field === 'comments' ||
        (c.field === 'feed' && v.item === 'comment' && (v.verb || 'add') === 'add')
      if (!isComment) continue
      const from = v.from || {}
      out.push({
        kind: 'comment',
        platform,
        text: v.text || v.message || '',
        senderId: from.id ? String(from.id) : null,
        commentId: String(v.id || v.comment_id || ''),
        eventId: String(v.id || v.comment_id || `${entry.id}:${c.time || ''}`),
        fromId: from.id ? String(from.id) : null,
        name: from.username || from.name || null,
        isEcho: false,
      })
    }
  }
  return out
}

/**
 * Le commentaire vient-il de nous ? Répondre à sa propre page produit une
 * boucle : notre réponse est un commentaire, qui déclenche un webhook…
 */
export function isOwnEvent(ev, entryId) {
  const mine = new Set([PAGE_ID, IG_ID, entryId].filter(Boolean).map(String))
  return ev.isEcho || (ev.fromId ? mine.has(ev.fromId) : false)
}

// ── Envois ───────────────────────────────────────────────────────────────

async function graph(path, payload) {
  if (dryRun || !PAGE_TOKEN) {
    console.log('[meta] simulation —', path, JSON.stringify(payload).slice(0, 200))
    return { simulated: true }
  }
  const res = await fetch(`${GRAPH}/${path}?access_token=${encodeURIComponent(PAGE_TOKEN)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const raw = await res.text()
  if (!res.ok) {
    // Le corps peut contenir le message envoyé : on ne garde que le code
    // d'erreur Meta, qui suffit à diagnostiquer (190 = jeton expiré,
    // 10/200 = permission manquante, 613 = quota).
    let code = null
    try { code = (JSON.parse(raw).error || {}).code ?? null } catch { /* pas du JSON */ }
    const err = new Error(`${path} -> ${res.status} (code ${code})`)
    err.status = res.status
    err.metaCode = code
    throw err
  }
  return raw ? JSON.parse(raw) : {}
}

/** Message privé (Messenger et Instagram partagent le même point d'entrée). */
export function sendDirectMessage(recipientId, text) {
  return graph('me/messages', {
    recipient: { id: recipientId },
    message: { text },
    messaging_type: 'RESPONSE',
  })
}

/** Réponse publique sous un commentaire. */
export function replyToComment(commentId, text, platform) {
  // Instagram : /{comment-id}/replies · Facebook : /{comment-id}/comments
  const path = platform === 'instagram' ? `${commentId}/replies` : `${commentId}/comments`
  return graph(path, { message: text })
}

/**
 * Réponse privée à l'auteur d'un commentaire (« private reply »).
 * Meta n'en autorise qu'une seule par commentaire, dans les 7 jours — d'où
 * l'échec silencieux côté appelant plutôt qu'une erreur bloquante.
 */
export function privateReplyToComment(commentId, text) {
  return graph('me/messages', {
    recipient: { comment_id: commentId },
    message: { text },
  })
}
