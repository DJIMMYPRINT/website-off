// Réponses automatiques aux messages privés et aux commentaires.
//
// Ce fichier ne connaît ni Instagram, ni Facebook, ni aucun réseau : il prend
// un texte écrit par un client et rend la réponse à envoyer. C'est volontaire
// — la même fonction sert au webhook Meta (pages/api/social/webhook.js) et à
// la console de test (/auto-reponses), et elle se relit sans avoir à
// comprendre l'API Graph.
//
// Deux règles de fond, héritées du reste du site :
//
//  1. La réponse automatique n'a jamais le dernier mot. Chaque message
//     renvoie vers WhatsApp, qui reste le canal où la commande se conclut.
//     On répond vite, on ne prétend pas remplacer le patron.
//
//  2. Rien n'est inventé. Les prix, le minimum de commande, les horaires et
//     les techniques viennent de lib/constants.js et lib/products.js — les
//     mêmes sources que les pages. Une remise modifiée dans constants.js se
//     retrouve dans les réponses automatiques sans y toucher.
//
// Les clients écrivent en français, en arabe et en derja latinisée
// (« chhal », « wach kayn », « bezaf »). Les mots-clés couvrent les trois.

import { WA, PHONE_DISPLAY, EMAIL, ADDRESS, SITE_URL, MIN_ORDER, HOURS, TECHNIQUES } from './constants.js'
import { PRODUCTS } from './products.js'

/** Canaux traités. Un commentaire est public : la réponse y est plus courte. */
export const CHANNELS = ['dm', 'comment']

const SITE = `https://${SITE_URL}`
const wa = (text) => `https://wa.me/${WA}?text=${encodeURIComponent(text)}`

// Fourchette de prix calculée depuis le catalogue : pas de chiffre recopié
// à la main qui se démoderait au premier changement de tarif.
const PRICES = PRODUCTS.map(p => p.price).filter(Boolean)
const PRICE_MIN = Math.min(...PRICES)
const PRICE_MAX = Math.max(...PRICES)
const da = (n) => `${n.toLocaleString('fr-DZ').replace(/ | /g, ' ')} DA`

/**
 * Minuscules, sans accents, sans ponctuation, espaces normalisés.
 * L'arabe passe à travers sans dommage (la décomposition NFD ne retire que
 * les diacritiques latins ciblés par la plage \u0300-\u036f).
 */
export function normalize(input) {
  return String(input || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s@#-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Un mot-clé purement latin est cherché avec des frontières de mot, sinon
// « prix » matcherait dans « caprice ». Le pluriel est toléré (« ouverts »,
// « tarifs ») : sans cela la moitié des messages réels passent à côté.
// L'arabe n'a pas de \b utilisable : on y cherche la sous-chaîne telle quelle.
//
// Une expression pèse autant que son nombre de mots : « combien de temps »
// (délai) doit l'emporter sur le simple « combien » (prix), sinon toute
// question de délai est chiffrée comme une demande de tarif.
const LATIN_ONLY = /^[a-z0-9 '-]+$/
function hits(text, keywords) {
  let score = 0
  for (const k of keywords) {
    const key = normalize(k)
    if (!key) continue
    const weight = key.split(' ').length
    if (LATIN_ONLY.test(key)) {
      const esc = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      if (new RegExp(`(^|\\s)${esc}(s|es)?(\\s|$)`, 'u').test(text)) score += weight
    } else if (text.includes(key)) score += weight
  }
  return score
}

/** Référence de commande citée dans le message : DP-XXXXXX. */
export function findRef(input) {
  const m = normalize(input).toUpperCase().match(/\bDP[-\s]?([A-Z0-9]{4,12})\b/)
  return m ? `DP-${m[1]}` : null
}

// ── Horaires ─────────────────────────────────────────────────────────────
// L'Algérie est à UTC+1 toute l'année (pas d'heure d'été), donc l'heure
// locale se calcule sans dépendance ni base de fuseaux.
const OPEN = {
  0: [8, 18], 1: [8, 18], 2: [8, 18], 3: [8, 18], 4: [8, 18], // dimanche → jeudi
  5: [8, 12],                                                  // vendredi
  6: null,                                                     // samedi : sur RDV
}

export function algiersNow(date = new Date()) {
  const t = new Date(date.getTime() + 60 * 60 * 1000) // UTC+1
  return { day: t.getUTCDay(), hour: t.getUTCHours() + t.getUTCMinutes() / 60 }
}

export function isOpenNow(date = new Date()) {
  const { day, hour } = algiersNow(date)
  const slot = OPEN[day]
  return Boolean(slot) && hour >= slot[0] && hour < slot[1]
}

const HOURS_LINE = HOURS.map(([d, h]) => `${d} : ${h}`).join(' · ')

// ── Règles ───────────────────────────────────────────────────────────────
// Ordre = priorité en cas d'égalité de score. Les intentions précises
// (référence de commande, minimum, délai) passent avant les générales.
//
// `strong`  : mots-clés sans ambiguïté (« devis », « échantillon »). Ils
//             pèsent quatre fois, sinon une tournure générique d'une autre
//             règle (« je voudrais… », qui vaut deux mots) passe devant le
//             seul mot qui dit vraiment ce que le client demande.
// `dm`      : réponse en message privé — on peut être complet.
// `comment` : réponse publique sous un commentaire — courte, elle est lue
//             par tout le monde et Instagram tronque les longs textes.

export const RULES = [
  {
    key: 'suivi',
    label: 'Suivi de commande',
    hint: 'Le message cite une référence DP-XXXXXX',
    keywords: ['suivi', 'suivre', 'ou en est', 'avancement', 'ma commande', 'reference', 'وين وصلات', 'الطلبية'],
    dm: (c) => `Bonjour ${c.name}, on regarde ça tout de suite 👀\n\n` +
      (c.ref
        ? `Votre référence : ${c.ref}\nÉtat en direct : ${SITE}/suivi?ref=${c.ref}\n\n`
        : `Suivez votre commande avec votre référence (format DP-XXXXXX) : ${SITE}/suivi\n\n`) +
      `Pour le détail exact (atelier, expédition), écrivez-nous sur WhatsApp : ${wa(`Bonjour Djimmy Prints, où en est ma commande ${c.ref || ''} ?`.trim())}`,
    comment: (c) => `Bonjour ${c.name} 👋 Suivez votre commande ici : ${SITE}/suivi${c.ref ? `?ref=${c.ref}` : ''} — et on vous répond en privé sur WhatsApp au ${PHONE_DISPLAY} pour le détail.`,
  },
  {
    key: 'prix',
    label: 'Prix / tarif',
    hint: 'Demande de tarif, « c\'est combien ? »',
    keywords: [
      'prix', 'tarif', 'combien', 'cout', 'coute', 'coûte', 'price', 'how much', 'cher',
      'chhal', 'ch7al', 'bchhal', 'bch7al', 'kadech', 'gadech', 'kadesh', '9adach', 'chal',
      'سعر', 'الثمن', 'بشحال', 'شحال', 'كم',
    ],
    dm: (c) => `Bonjour ${c.name} 👋 Merci pour votre message !\n\n` +
      `Nos tarifs vont de ${da(PRICE_MIN)} à ${da(PRICE_MAX)} la pièce selon le vêtement, avec remise automatique à partir de 50 pièces (jusqu'à −15 % à 200 pièces).\n\n` +
      `• Catalogue et prix détaillés : ${SITE}/catalogue\n` +
      `• Devis gratuit en 2 minutes : ${SITE}/devis\n\n` +
      `Dites-nous le vêtement, la quantité et la technique (broderie, sérigraphie, transfert…) et on vous chiffre ça précisément : ${c.links.devisWa}`,
    comment: (c) => `Bonjour ${c.name} 👋 À partir de ${da(PRICE_MIN)} la pièce selon le modèle, avec remise dès 50 pièces. Tous les prix : ${SITE}/catalogue — devis gratuit sur WhatsApp ${PHONE_DISPLAY} 💬`,
  },
  {
    key: 'devis',
    label: 'Demande de devis',
    hint: 'Le client veut un chiffrage écrit',
    keywords: ['devis', 'quote', 'quotation', 'estimation', 'facture proforma', 'proforma', 'عرض سعر', 'فاتورة'],
    strong: ['devis', 'proforma', 'عرض سعر'],
    dm: (c) => `Bonjour ${c.name}, avec plaisir 📄\n\n` +
      `Le devis est gratuit et sans engagement. Le plus rapide : ${SITE}/devis (2 minutes, vous recevez une estimation immédiate).\n\n` +
      `Il nous faut : le vêtement, la quantité, la technique de marquage et votre wilaya. Envoyez aussi votre logo si vous l'avez, on vous répond avec le prix ferme : ${c.links.devisWa}`,
    comment: (c) => `Bonjour ${c.name} 👋 Devis gratuit ici : ${SITE}/devis — ou envoyez-nous quantité + vêtement sur WhatsApp ${PHONE_DISPLAY} et on vous chiffre ça 📄`,
  },
  {
    key: 'minimum',
    label: 'Quantité minimale',
    hint: '« Vous faites une seule pièce ? »',
    keywords: ['minimum', 'min', 'une piece', '1 piece', 'une seule', 'petite quantite', 'unite', 'detail', 'واحدة', 'قطعة وحدة'],
    strong: ['minimum', 'une seule', 'واحدة'],
    dm: (c) => `Bonjour ${c.name} 🙂\n\n` +
      `Notre minimum de commande est de ${MIN_ORDER} pièces (nous sommes un atelier B2B : uniformes et tenues de travail pour équipes).\n\n` +
      `À partir de 50 pièces la remise volume s'applique automatiquement, jusqu'à −15 % dès 200 pièces.\n\n` +
      `Voir le détail : ${SITE}/commande`,
    comment: (c) => `Bonjour ${c.name} 👋 Minimum ${MIN_ORDER} pièces (atelier B2B, tenues d'équipe), avec remise dès 50 pièces. Détails : ${SITE}/commande`,
  },
  {
    key: 'delai',
    label: 'Délai de production',
    hint: '« C\'est prêt en combien de temps ? »',
    keywords: [
      'delai', 'delais', 'combien de temps', 'quand', 'rapide', 'urgent', 'presse', 'vite',
      'waqtach', 'wektach', 'wa9tach', 'when', 'how long', 'وقتاش', 'مدة', 'وقت',
    ],
    dm: (c) => `Bonjour ${c.name} ⏱\n\n` +
      `Comptez en général 5 à 10 jours ouvrables entre la validation du bon à tirer et la livraison, selon la quantité et la technique. Les urgences se traitent au cas par cas — dites-nous votre date butoir.\n\n` +
      `Écrivez-nous la quantité et la date souhaitée, on vous confirme le planning : ${c.links.wa}`,
    comment: (c) => `Bonjour ${c.name} 👋 En général 5 à 10 jours ouvrables selon la quantité et la technique. Urgence possible — écrivez-nous sur WhatsApp ${PHONE_DISPLAY} ⏱`,
  },
  {
    key: 'livraison',
    label: 'Livraison',
    hint: 'Expédition, wilayas',
    keywords: [
      'livraison', 'livrer', 'livrez', 'expedition', 'envoi', 'envoyer', 'transporteur', 'wilaya',
      'yalidine', 'zr express', 'delivery', 'shipping', 'توصيل', 'ولاية', 'شحن',
    ],
    dm: (c) => `Bonjour ${c.name} 🚚\n\n` +
      `Nous livrons dans les 58 wilayas. Les frais et le délai dépendent de votre wilaya et du volume ; à Alger, remise en main propre possible à l'atelier (${ADDRESS}).\n\n` +
      `Donnez-nous votre wilaya et la quantité, on vous confirme le coût exact : ${c.links.wa}`,
    comment: (c) => `Bonjour ${c.name} 👋 Nous livrons dans les 58 wilayas 🚚 Dites-nous votre wilaya sur WhatsApp ${PHONE_DISPLAY} et on vous donne le délai et les frais.`,
  },
  {
    key: 'technique',
    label: 'Technique de marquage / logo',
    hint: 'Broderie, sérigraphie, transfert, logo',
    keywords: [
      'broderie', 'brodee', 'broder', 'brodez', 'brodons', 'serigraphie', 'sublimation',
      'sublimer', 'transfert', 'flocage', 'floquer', 'floquez', 'flex',
      'logo', 'marquage', 'impression', 'imprimer', 'personnalisation', 'personnalise', 'floquer',
      'embroidery', 'print', 'طرز', 'شعار', 'طباعة',
    ],
    dm: (c) => `Bonjour ${c.name} 🧵\n\n` +
      `Nous marquons vos tenues en ${TECHNIQUES.join(', ').toLowerCase()}. Le choix dépend du support et du nombre de couleurs de votre logo — on vous conseille gratuitement.\n\n` +
      `Astuce : sur ${SITE}/catalogue vous pouvez charger votre logo et le positionner vous-même sur le vêtement pour voir le rendu avant de commander.\n\n` +
      `Envoyez-nous votre logo (PNG, PDF ou AI de préférence) et on vous dit la meilleure technique : ${c.links.wa}`,
    comment: (c) => `Bonjour ${c.name} 👋 Broderie, sérigraphie, transfert, sublimation et flocage 🧵 Testez le rendu de votre logo ici : ${SITE}/catalogue`,
  },
  {
    key: 'catalogue',
    label: 'Produits / catalogue',
    hint: 'Le client demande ce que vous faites',
    keywords: [
      'catalogue', 'produit', 'produits', 'modele', 'modeles', 'photo', 'photos', 'dispo', 'disponible',
      'polo', 't shirt', 'tshirt', 'tee shirt', 'chemise', 'veste', 'tablier', 'gilet', 'casquette',
      'pantalon', 'sweat', 'hoodie', 'combinaison', 'bleu de travail', 'uniforme', 'tenue', 'blouse',
      'taille', 'tailles', 'couleur', 'couleurs',
      'wach kayn', 'kayen', 'chi7aja', 'قميص', 'قبعة', 'بدلة', 'ملابس',
    ],
    dm: (c) => `Bonjour ${c.name} 👕\n\n` +
      `Nous fabriquons et marquons des tenues professionnelles : polos, t-shirts, chemises, vestes, tabliers, gilets, casquettes, pantalons et combinaisons de travail — du XS au 3XL, dans la couleur de votre choix.\n\n` +
      `Le catalogue complet, avec les prix et les photos : ${SITE}/catalogue\n\n` +
      `Dites-nous ce qu'il vous faut et pour combien de personnes 👉 ${c.links.wa}`,
    comment: (c) => `Bonjour ${c.name} 👋 Polos, t-shirts, tabliers, vestes, casquettes, combinaisons… tout le catalogue avec les prix : ${SITE}/catalogue 👕`,
  },
  {
    key: 'commande',
    label: 'Intention de commander',
    hint: '« Je veux commander »',
    keywords: [
      'commander', 'commande', 'je veux', 'je voudrais', 'je souhaite', 'acheter', 'passer commande',
      'order', 'i want', 'nchri', 'nheb', 'حاب', 'نحب', 'نشري', 'أطلب',
    ],
    dm: (c) => `Bonjour ${c.name}, super 🙌\n\n` +
      `Deux façons de faire :\n` +
      `• L'assistant de commande en 3 étapes (produits → technique & logo → livraison) : ${SITE}/commande — il calcule la remise et vous donne une référence de suivi.\n` +
      `• Ou directement avec nous sur WhatsApp : ${c.links.wa}\n\n` +
      `Minimum ${MIN_ORDER} pièces. Il nous faudra : vêtement, quantité par taille, technique de marquage, votre logo et votre wilaya.`,
    comment: (c) => `Bonjour ${c.name} 🙌 Commandez ici : ${SITE}/commande — ou écrivez-nous sur WhatsApp ${PHONE_DISPLAY}, on s'occupe de tout.`,
  },
  {
    key: 'horaires',
    label: 'Horaires / adresse',
    hint: 'Ouverture, localisation, contact',
    keywords: [
      'horaire', 'horaires', 'ouvert', 'ouverte', 'ferme', 'fermez', 'ouvrez', 'heure', 'heures',
      'adresse', 'ou etes vous', 'ou vous trouver', 'localisation', 'atelier', 'magasin', 'boutique',
      'numero', 'telephone', 'contact', 'email', 'mail', 'وين', 'العنوان', 'مفتوح', 'رقم',
    ],
    dm: (c) => `Bonjour ${c.name} 📍\n\n` +
      `Atelier : ${ADDRESS}\n` +
      `Téléphone / WhatsApp : ${PHONE_DISPLAY}\n` +
      `Email : ${EMAIL}\n` +
      `Horaires : ${HOURS_LINE}\n\n` +
      `Toutes les infos : ${SITE}/contact`,
    comment: (c) => `Bonjour ${c.name} 👋 ${ADDRESS} · ${PHONE_DISPLAY} · ${HOURS_LINE}. Plus d'infos : ${SITE}/contact 📍`,
  },
  {
    key: 'remerciement',
    label: 'Remerciement / compliment',
    hint: '« Merci », « très beau travail »',
    keywords: [
      'merci', 'mercii', 'thanks', 'thank you', 'choukran', 'chokran', 'saha', 'sahit', 'bravo',
      'magnifique', 'super', 'top', 'parfait', 'شكرا', 'صحيت', 'يعطيك الصحة',
    ],
    dm: (c) => `Merci à vous ${c.name} 🙏 Ça fait plaisir !\n\n` +
      `Au moindre besoin en tenues pour votre équipe, on est sur WhatsApp : ${c.links.wa}`,
    comment: (c) => `Merci ${c.name} 🙏 À votre service pour les tenues de votre équipe — ${SITE}`,
  },
  {
    key: 'salutation',
    label: 'Salutation seule',
    hint: '« Salam », « bonjour » sans autre contenu',
    keywords: [
      'bonjour', 'bonsoir', 'salut', 'slt', 'cc', 'coucou', 'hello', 'hi', 'hey',
      'salam', 'slm', 'salamou alaykoum', 'aslema', 'السلام عليكم', 'سلام', 'صباح الخير', 'مساء الخير',
    ],
    dm: (c) => `Bonjour ${c.name} 👋 Bienvenue chez Djimmy Prints !\n\n` +
      `Nous imprimons et brodons les tenues de travail des équipes : polos, t-shirts, tabliers, vestes, casquettes… à partir de ${MIN_ORDER} pièces.\n\n` +
      `Dites-nous ce dont vous avez besoin (vêtement, quantité, logo) et on vous répond avec un prix. Catalogue : ${SITE}/catalogue`,
    comment: (c) => `Bonjour ${c.name} 👋 Bienvenue ! Écrivez-nous sur WhatsApp ${PHONE_DISPLAY} ou découvrez le catalogue : ${SITE}/catalogue`,
  },
]

/** Réponse quand rien ne correspond : on ne bluffe pas, on oriente. */
export const FALLBACK = {
  key: 'defaut',
  label: 'Réponse par défaut',
  hint: 'Aucun mot-clé reconnu',
  keywords: [],
  dm: (c) => `Bonjour ${c.name} 👋 Merci pour votre message !\n\n` +
    `Nous personnalisons les tenues professionnelles (broderie, sérigraphie, transfert) à partir de ${MIN_ORDER} pièces.\n\n` +
    `Pour vous répondre précisément, dites-nous : le vêtement, la quantité et votre wilaya. Un conseiller vous répond sur WhatsApp : ${c.links.wa}\n\n` +
    `Catalogue et prix : ${SITE}/catalogue`,
  comment: (c) => `Bonjour ${c.name} 👋 Merci pour votre message ! Écrivez-nous sur WhatsApp ${PHONE_DISPLAY} ou passez par ${SITE} — on vous répond tout de suite 💬`,
}

/**
 * Faut-il répondre du tout ?
 * Un commentaire vide, une simple mention (« @ami regarde ») ou une suite
 * d'emoji n'appellent pas de réponse commerciale : mieux vaut se taire que
 * spammer sa propre page.
 */
export function shouldReply(input) {
  const raw = String(input || '').trim()
  if (!raw) return false
  const withoutMentions = raw.replace(/[@#][\p{L}\p{N}._-]+/gu, ' ')
  return normalize(withoutMentions).replace(/\s/g, '').length >= 2
}

/** Règle la mieux notée, ou le repli. Exportée pour la console de test. */
export function matchRule(message) {
  const text = normalize(message)
  const ref = findRef(message)
  let best = null
  let bestScore = 0
  for (const rule of RULES) {
    // Une référence citée l'emporte : le client attend un état, pas un tarif.
    let score = hits(text, rule.keywords) + 3 * hits(text, rule.strong || [])
    if (rule.key === 'suivi' && ref) score += 3
    if (score > bestScore) { best = rule; bestScore = score }
  }
  return { rule: best || FALLBACK, score: bestScore, ref }
}

/**
 * Construit la réponse à envoyer.
 *
 * @param {string}  message  ce que le client a écrit
 * @param {object} [opts]
 * @param {'dm'|'comment'} [opts.channel='dm']
 * @param {string} [opts.name]  prénom/pseudo, utilisé tel quel dans l'accroche
 * @param {Date}   [opts.now]   pour tester la mention « hors horaires »
 * @returns {{intent:string,label:string,score:number,ref:?string,channel:string,text:string,skipped:boolean}}
 */
export function buildReply(message, opts = {}) {
  const channel = CHANNELS.includes(opts.channel) ? opts.channel : 'dm'
  const now = opts.now || new Date()
  const skipped = !shouldReply(message)
  const { rule, score, ref } = matchRule(message)

  // Le prénom est repris tel quel dans le texte : on retire ce qui n'a pas
  // sa place dans une accroche (URL, @, emoji) plutôt que de faire confiance.
  const name = normalizeName(opts.name)

  const ctx = {
    name,
    ref,
    links: {
      wa: wa('Bonjour Djimmy Prints, je vous écris depuis vos réseaux sociaux.'),
      devisWa: wa('Bonjour Djimmy Prints, je souhaite un devis pour des tenues personnalisées.'),
      site: SITE,
    },
  }

  let text = rule[channel](ctx)

  // Hors horaires, on le dit — en message privé seulement : c'est une
  // information utile au client, pas une annonce à afficher sous un post.
  if (channel === 'dm' && !isOpenNow(now) && rule.key !== 'suivi') {
    text += `\n\n🕐 Message reçu en dehors de nos horaires (${HOURS_LINE}). Un humain vous répond à la première heure d'ouverture.`
  }

  return { intent: rule.key, label: rule.label, score, ref, channel, text, skipped }
}

/** Pseudo réseau social → accroche présentable, « client » à défaut. */
export function normalizeName(input) {
  const cleaned = String(input || '')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[^\p{L}\p{N}\s'-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!cleaned || cleaned.length > 40) return 'cher client'
  // « jean.dupont_92 » → « Jean », un seul mot suffit et évite les pseudos à rallonge.
  const first = cleaned.split(' ')[0]
  return first.charAt(0).toUpperCase() + first.slice(1)
}
