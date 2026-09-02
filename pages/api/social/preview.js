import { buildReply, INTENT_LIST } from '../../../lib/autoreply'

// Banc d'essai du bot, sans rien brancher.
//
//   GET  /api/social/preview?text=chhal%20polo
//   POST /api/social/preview   { "text": "chhal polo" }
//   GET  /api/social/preview            -> liste des intentions reconnues
//
// Aucun secret, aucun appel réseau : la même fonction que celle utilisée par
// le webhook, exposée pour vérifier en une commande ce que la version
// déployée répondrait.

export default function handler(req, res) {
  const text = req.method === 'POST'
    ? (req.body?.text ?? '')
    : (req.query.text ?? '')

  if (!String(text).trim()) {
    return res.status(200).json({
      usage: 'GET /api/social/preview?text=votre+message',
      intents: INTENT_LIST,
    })
  }

  const reply = buildReply(String(text).slice(0, 2000))
  return res.status(200).json({
    question: String(text),
    intent: reply.intent,
    label: reply.label,
    handoff: reply.handoff,
    open: reply.open,
    reply: reply.text,
  })
}
