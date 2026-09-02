// Campagnes « commente MOT → reçois le lien en DM ».
//
// ┌────────────────────────────────────────────────────────────────────────┐
// │ C'EST LE SEUL FICHIER À MODIFIER POUR LANCER UNE NOUVELLE CAMPAGNE.    │
// │ Ajoutez un bloc dans CAMPAIGNS, vérifiez sur /bot, redéployez.         │
// └────────────────────────────────────────────────────────────────────────┘
//
// Fonctionnement : quelqu'un commente le mot-clé sous une publication, le
// webhook répond publiquement sous son commentaire (« regarde tes DM 📩 »)
// et lui envoie le message privé de la campagne. Les deux gestes comptent
// pour l'algorithme : commentaire + conversation privée.
//
// Deux limites imposées par Meta, à connaître avant de promettre quoi que
// ce soit en vidéo :
//   • un seul message privé par commentaire, jamais deux ;
//   • dans les 7 jours suivant le commentaire (au-delà, plus rien ne part).
// Donc : un mot-clé différent par sujet, et on ne relance pas.

import { normalize } from './autoreply'
import { WA, SITE_URL, EMAIL } from './constants'

const SITE = `https://${SITE_URL}`
const env = k => String(process.env[k] || '').trim()
const ids = v => v.split(/[,\s]+/).map(s => s.trim()).filter(Boolean)

/* ──────────────────────────────── comptes ─────────────────────────────── */

// Un déploiement, plusieurs comptes. Le webhook reconnaît le compte
// destinataire par l'identifiant que Meta envoie dans `entry.id` (identifiant
// de la Page Facebook ou du compte Instagram professionnel).
//
// SOCIAL_IDS_* accepte plusieurs identifiants séparés par une virgule
// (typiquement : l'id de la Page ET celui du compte Instagram lié).
export const ACCOUNTS = [
  {
    key: 'djimmy',
    label: 'Djimmy Prints',
    brain: 'djimmy',                 // répondeur commercial complet
    ids: ids(env('SOCIAL_IDS_DJIMMY')),
    token: env('META_TOKEN_DJIMMY') || env('META_PAGE_TOKEN'),
  },
  {
    key: 'amouri',
    label: 'Amouri Djameleddine',
    brain: 'brand',                  // marque personnelle : campagnes + humain
    ids: ids(env('SOCIAL_IDS_AMOURI')),
    token: env('META_TOKEN_AMOURI') || env('META_PAGE_TOKEN'),
  },
]

/**
 * Compte visé par un événement, d'après l'identifiant reçu.
 * Tant que SOCIAL_IDS_* n'est pas renseigné (un seul compte branché), tout
 * arrive sur le premier compte — le comportement d'avant le multi-compte.
 */
export function accountFor(entryId) {
  const id = String(entryId || '')
  return ACCOUNTS.find(a => a.ids.includes(id)) || ACCOUNTS[0]
}

export function accountByKey(key) {
  return ACCOUNTS.find(a => a.key === key) || ACCOUNTS[0]
}

/* ─────────────────────────────── campagnes ────────────────────────────── */

// Chaque campagne :
//   id          identifiant court, unique (sert dans les logs)
//   account     'djimmy' ou 'amouri'
//   keywords    mots-clés à commenter. Insensible aux accents et à la casse.
//   media       'all' (toutes les publications du compte) ou une liste
//               d'identifiants de publication pour cibler une seule vidéo
//   publicReply variantes de réponse publique — tirée au hasard pour ne pas
//               afficher dix fois la même phrase sous le même post
//   dm          le message privé. Un texte, ou plusieurs envoyés à la suite.
//               {prenom} est remplacé par le prénom / pseudo du commentateur
//   active      false met la campagne en pause sans la supprimer
export const CAMPAIGNS = [
  /* ══ Marque personnelle : Amouri Djameleddine ══
     Tutoiement, ton direct. Chaque campagne envoie une ressource qui existe
     vraiment sur le site — jamais une promesse sans lien. */
  {
    id: 'guide',
    account: 'amouri',
    keywords: ['GUIDE', 'GIDE', 'GUID'],
    media: 'all',
    active: true,
    publicReply: [
      'Envoyé en privé {prenom} 📩',
      'C\'est parti, regarde tes DM 📩',
      'Je viens de te l\'envoyer en message privé 📩',
    ],
    dm: [
      'Salut {prenom} 👋 Merci pour ton commentaire !',
      `Voici le guide complet, gratuit et sans inscription 👉 ${SITE}/guide`,
      'Dedans : le bon vêtement par métier, la technique de marquage à choisir, comment préparer ton logo, et un exemple de budget chiffré.\n\nDis-moi ton secteur d\'activité, je te dis par quoi commencer.',
    ],
  },
  {
    id: 'prix-perso',
    account: 'amouri',
    keywords: ['PRIX', 'TARIF', 'TARIFS'],
    media: 'all',
    active: true,
    publicReply: ['Les prix sont dans tes DM {prenom} 📩', 'Envoyé en privé 📩'],
    dm: [
      `Salut {prenom} 👋 Tous les prix sont affichés ici, sans devoir demander : ${SITE}/catalogue`,
      `Minimum 20 pièces, remise automatique dès 50 (et −10 % de plus en paiement anticipé). Pour un chiffrage précis : ${SITE}/devis`,
    ],
  },
  {
    id: 'technique',
    account: 'amouri',
    keywords: ['TECHNIQUE', 'BRODERIE', 'SERIGRAPHIE'],
    media: 'all',
    active: true,
    publicReply: ['Je t\'explique tout en DM 📩', 'Envoyé en privé {prenom} 📩'],
    dm: [
      `Salut {prenom} 👋 Le comparatif des 5 techniques (tenue dans le temps, nombre de couleurs, coût, support idéal) est ici 👉 ${SITE}/guide`,
      'En deux mots : broderie pour le haut de gamme et la durée, sérigraphie pour les grandes séries, transfert numérique pour les logos complexes.',
    ],
  },
  {
    id: 'logo',
    account: 'amouri',
    keywords: ['LOGO', 'MAQUETTE'],
    media: 'all',
    active: true,
    publicReply: ['Regarde tes messages privés {prenom} 📩'],
    dm: [
      `Salut {prenom} 👋 Tu peux poser ton logo sur le vêtement et voir le rendu tout de suite ici 👉 ${SITE}/catalogue`,
      'Envoie-le en SVG, ou en PNG 300 dpi minimum. Si tu n\'as qu\'une image basse définition, on te la vectorise.',
    ],
  },
  {
    id: 'contact-perso',
    account: 'amouri',
    keywords: ['INFO', 'INFOS', 'CONTACT'],
    media: 'all',
    active: true,
    publicReply: ['Je t\'écris en privé 📩'],
    dm: `Salut {prenom} 👋 Dis-moi ce dont tu as besoin, je te réponds directement.\n\nWhatsApp : https://wa.me/${WA}\nEmail : ${EMAIL}`,
  },

  /* ══ Compte Djimmy Prints ══
     Vouvoiement, ton commercial, comme le reste du site. */
  {
    id: 'catalogue',
    account: 'djimmy',
    keywords: ['CATALOGUE', 'CATALOG', 'PRIX', 'TARIF'],
    media: 'all',
    active: true,
    publicReply: [
      'Envoyé en DM {prenom} 📩',
      'C\'est dans vos messages privés 📩',
      'Le catalogue vient de partir en privé 📩',
    ],
    dm: [
      `Bonjour {prenom} 👋 Voici notre catalogue avec tous les prix affichés : ${SITE}/catalogue`,
      `Minimum 20 pièces · remise automatique dès 50 · livraison dans les 58 wilayas.\n\nPour un devis gratuit sous 24 h : ${SITE}/devis`,
    ],
  },
  {
    id: 'devis',
    account: 'djimmy',
    keywords: ['DEVIS'],
    media: 'all',
    active: true,
    publicReply: ['Votre devis part en DM 📩', 'Je vous réponds en privé {prenom} 📩'],
    dm: `Bonjour {prenom} 👋 Devis gratuit, réponse sous 24 h : ${SITE}/devis\n\nOu donnez-moi ici le produit, la quantité et la technique de marquage, et je vous chiffre ça directement.`,
  },
  {
    id: 'guide-djimmy',
    account: 'djimmy',
    keywords: ['GUIDE'],
    media: 'all',
    active: true,
    publicReply: ['Le guide est dans vos DM 📩'],
    dm: [
      `Bonjour {prenom} 👋 Notre guide gratuit pour équiper une équipe sans se tromper : ${SITE}/guide`,
      'Vêtement par métier, technique de marquage, préparation du logo, budget et répartition des tailles.',
    ],
  },
  {
    id: 'commander',
    account: 'djimmy',
    keywords: ['COMMANDE', 'COMMANDER'],
    media: 'all',
    active: true,
    publicReply: ['Tout est expliqué dans vos DM 📩'],
    dm: [
      `Bonjour {prenom} 👋 La commande se fait en 3 étapes ici : ${SITE}/commande`,
      'Produits et tailles → technique et logo → livraison et paiement. Vous recevez une référence DP-XXXXXX pour suivre la production.',
    ],
  },
  {
    id: 'suivi',
    account: 'djimmy',
    keywords: ['SUIVI'],
    media: 'all',
    active: true,
    publicReply: ['Je vous réponds en privé 📩'],
    dm: `Bonjour {prenom} 👋 Pour suivre votre commande, entrez votre référence DP-XXXXXX ici : ${SITE}/suivi\n\nVous pouvez aussi me la donner directement dans cette conversation.`,
  },
]

/* ─────────────────────────────── recherche ────────────────────────────── */

function pick(list, seed) {
  if (!Array.isArray(list) || list.length === 0) return null
  // Tirage stable pour un même commentaire : rejouer le même événement donne
  // la même phrase, sans variation inexplicable dans les logs.
  const n = String(seed || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return list[n % list.length]
}

function firstName(who) {
  // Un pseudo Instagram vaut mieux que rien, mais « yacine.dz_2000 » se lit
  // mal : on garde le premier morceau.
  return String(who || '').trim().split(/[\s._-]+/)[0].slice(0, 24)
}

function fill(text, ctx) {
  // Sans prénom (rare : Meta le fournit presque toujours), on avale aussi
  // l'espace qui précède, pour « Envoyé en DM 📩 » et non « Envoyé en DM  📩 ».
  const name = firstName(ctx?.name)
  return String(text)
    .replace(/ ?\{prenom\}/g, name ? ` ${name}` : '')
    .replace(/^ +/gm, '')
}

/**
 * Campagne déclenchée par un commentaire (ou un DM contenant le mot-clé).
 * Une campagne ciblant une publication précise l'emporte sur une campagne
 * « toutes publications ».
 */
export function matchCampaign({ accountKey, mediaId, text }) {
  const n = ` ${normalize(text)} `
  const hits = CAMPAIGNS.filter(c => {
    if (!c.active) return false
    if (accountKey && c.account !== accountKey) return false
    if (c.media !== 'all' && !(Array.isArray(c.media) && c.media.includes(String(mediaId)))) return false
    return c.keywords.some(k => new RegExp(`(^| )${normalize(k)}( |$)`).test(n))
  })
  if (hits.length === 0) return null
  return hits.sort((a, b) => (a.media === 'all' ? 1 : 0) - (b.media === 'all' ? 1 : 0))[0]
}

/** Réponse publique sous le commentaire (null si la campagne n'en veut pas). */
export function publicReplyFor(campaign, ctx) {
  const variant = pick(campaign.publicReply, ctx?.commentId || ctx?.name)
  return variant ? fill(variant, ctx) : null
}

/** Le ou les messages privés à envoyer, dans l'ordre. */
export function dmFor(campaign, ctx) {
  const list = Array.isArray(campaign.dm) ? campaign.dm : [campaign.dm]
  return list.filter(Boolean).map(t => fill(t, ctx))
}

/* ────────────────────── répondeur de la marque perso ──────────────────── */

// Le compte personnel n'a pas de catalogue à réciter : il livre la ressource
// promise si le mot-clé arrive en message privé, et sinon il dit franchement
// qu'un humain prend le relais. Pas de bavardage automatique au nom d'une
// personne réelle.
export function buildBrandReply(text, ctx = {}) {
  const campaign = matchCampaign({ accountKey: ctx.accountKey || 'amouri', text })
  if (campaign) {
    return {
      intent: `campagne:${campaign.id}`,
      label: `Campagne « ${campaign.keywords[0]} »`,
      text: dmFor(campaign, ctx).join('\n\n'),
      handoff: false,
      campaign,
    }
  }
  return {
    intent: 'brand_humain',
    label: 'À reprendre par un humain',
    text: [
      'Merci pour ton message 🙏',
      'Je transmets à Amouri — il te répond personnellement dès qu\'il est disponible.',
      '',
      '🤖 Réponse automatique',
    ].join('\n'),
    handoff: true,
    campaign: null,
  }
}

/** Campagnes actives d'un compte, pour la console /bot et la documentation. */
export function activeCampaigns(accountKey) {
  return CAMPAIGNS.filter(c => c.active && (!accountKey || c.account === accountKey))
}
