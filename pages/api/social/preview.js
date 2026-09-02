import { buildReply, INTENT_LIST } from '../../../lib/autoreply'
import {
  ACCOUNTS, accountByKey, matchCampaign, publicReplyFor, dmFor, buildBrandReply, activeCampaigns,
} from '../../../lib/campaigns'

// Banc d'essai, sans rien brancher ni rien envoyer.
//
//   GET /api/social/preview?text=chhal%20le%20polo
//   GET /api/social/preview?text=GUIDE&mode=comment&account=amouri
//   GET /api/social/preview                       -> intentions et campagnes
//
// Mêmes fonctions que le webhook, exposées pour vérifier en une commande ce
// que la version déployée répondrait.

export default function handler(req, res) {
  const src = req.method === 'POST' ? (req.body || {}) : req.query
  const text = String(src.text ?? '').slice(0, 2000)
  const account = accountByKey(String(src.account || 'djimmy'))
  const mode = String(src.mode || 'dm')
  const mediaId = String(src.media || '')

  if (!text.trim()) {
    return res.status(200).json({
      usage: 'GET /api/social/preview?text=votre+message[&mode=comment][&account=amouri]',
      comptes: ACCOUNTS.map(a => ({ key: a.key, label: a.label, configuré: Boolean(a.token), ids: a.ids })),
      campagnes: activeCampaigns().map(c => ({ id: c.id, compte: c.account, motsCles: c.keywords, media: c.media })),
      intentions: INTENT_LIST,
    })
  }

  // Commentaire sous une publication : campagne « commente X → reçois Y ».
  if (mode === 'comment') {
    const ctx = { name: String(src.name || ''), commentId: 'preview' }
    const campaign = matchCampaign({ accountKey: account.key, mediaId, text })
    return res.status(200).json({
      compte: account.label,
      commentaire: text,
      campagne: campaign ? campaign.id : null,
      reponsePublique: campaign ? publicReplyFor(campaign, ctx) : null,
      messagePrive: campaign ? dmFor(campaign, ctx).join('\n\n') : null,
      note: campaign ? undefined : 'Aucun mot-clé de campagne : le commentaire est laissé à un humain.',
    })
  }

  // Message privé.
  const reply = account.brain === 'brand'
    ? buildBrandReply(text, { accountKey: account.key, name: String(src.name || '') })
    : buildReply(text)

  return res.status(200).json({
    compte: account.label,
    question: text,
    intent: reply.intent,
    label: reply.label,
    handoff: reply.handoff,
    open: reply.open ?? null,
    reply: reply.campaign ? dmFor(reply.campaign, { name: String(src.name || '') }).join('\n\n') : reply.text,
  })
}
