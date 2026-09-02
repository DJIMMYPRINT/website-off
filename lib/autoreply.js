// Moteur de réponses automatiques — the brain behind the bot.
//
// One rule set, three consumers: the Meta webhook (Messenger, Instagram DM,
// WhatsApp Cloud API) in pages/api/social/webhook.js, the /api/social/preview
// endpoint, and the /bot test console. Nothing in this file talks to the
// network or reads env vars, so it stays testable from a plain `node -e`.
//
// Two principles it exists to enforce:
//
//  1. Never invent a business fact. Every price, delay, discount and policy
//     below is read from lib/products.js / lib/constants.js or copied from
//     the FAQ on /contact — the same facts the site shows. If a question is
//     not covered, the bot says so and hands over to a human instead of
//     guessing (`handoff: true`).
//  2. Never pretend to be a person. Every reply carries a short automatic
//     notice, and promises a human follow-up with the real opening hours.

import { PRODUCTS } from './products'
import {
  WA, PHONE_DISPLAY, EMAIL, ADDRESS, SITE_URL,
  MIN_ORDER, VOLUME_DISCOUNTS, TECHNIQUES, ORDER_STAGES,
  HOURS_SCHEDULE, TZ_OFFSET_HOURS,
} from './constants'

const SITE = `https://${SITE_URL}`
const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']

/* ────────────────────────── heures d'ouverture ────────────────────────── */

/** Local (Algiers) day-of-week and decimal hour for a given instant. */
function algiers(now = new Date()) {
  const t = new Date(now.getTime() + TZ_OFFSET_HOURS * 3600_000)
  return { day: t.getUTCDay(), hour: t.getUTCHours() + t.getUTCMinutes() / 60 }
}

export function isOpen(now = new Date()) {
  const { day, hour } = algiers(now)
  const slot = HOURS_SCHEDULE[day]
  return Boolean(slot) && hour >= slot[0] && hour < slot[1]
}

/** "demain à 8h", "dimanche à 8h" — when a human can realistically answer. */
function nextOpening(now = new Date()) {
  const { day, hour } = algiers(now)
  for (let i = 0; i < 8; i++) {
    const d = (day + i) % 7
    const slot = HOURS_SCHEDULE[d]
    if (!slot) continue
    if (i === 0 && hour < slot[0]) return `aujourd'hui à ${slot[0]}h`
    if (i > 0) return `${i === 1 ? 'demain' : DAYS[d]} à ${slot[0]}h`
  }
  return 'à la réouverture'
}

/* ──────────────────────────── normalisation ───────────────────────────── */

// Accents stripped, punctuation flattened to spaces: a customer typing
// "delai" or "Délai ?" must hit the same rule. Arabic script is left as-is —
// it carries no accents to strip and the keyword lists include it directly.
export function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

/* ───────────────────────────── blocs de texte ─────────────────────────── */

const AUTO_NOTE = '🤖 Réponse automatique'

const MENU = [
  'Vous pouvez me demander :',
  '• *prix* d\'un article  • *catalogue*  • *délai*',
  '• *livraison*  • *paiement*  • *minimum*  • *devis*',
  'Ou tapez votre référence *DP-XXXXXX* pour le suivi.',
].join('\n')

const price = n => `${n.toLocaleString('fr-DZ')} DA`

function priceList() {
  return PRODUCTS.map(p => `${p.emoji} ${p.name} — *${price(p.price)}* / pièce`).join('\n')
}

function discountList() {
  return VOLUME_DISCOUNTS
    .map(d => `• ${d.qty} pièces — ${d.dis} (${d.label})`)
    .join('\n')
}

function productCard(p) {
  return [
    `${p.emoji} *${p.name}* — ${price(p.price)} / pièce`,
    p.desc,
    `Marquage possible : ${p.techniques.join(', ')}.`,
    `Remise automatique dès 50 pièces. Minimum ${MIN_ORDER} pièces.`,
    `👉 ${SITE}/commande`,
  ].join('\n')
}

/** Un nom de produit cité dans le message, s'il y en a un. */
export function matchProduct(text) {
  const n = ` ${normalize(text)} `
  // Longest name first, so "polo manches longues" wins over "polo".
  const sorted = [...PRODUCTS].sort((a, b) => b.name.length - a.name.length)
  // Trailing "s" optional: customers write "des tabliers", "20 polos".
  return sorted.find(p => new RegExp(`(^| )${normalize(p.name)}s?( |$)`).test(n)) || null
}

/** Référence de commande DP-XXXXXX citée dans le message. */
export function matchRef(text) {
  const m = String(text || '').toUpperCase().match(/\bDP[-\s]?([A-Z0-9]{4,12})\b/)
  return m ? `DP-${m[1]}` : null
}

/* ──────────────────────────────── règles ──────────────────────────────── */

// Each rule scores by how many of its keywords appear in the normalised
// message; the best score wins. Keywords include the French spellings, the
// arabizi ones actually typed in Algeria (ch7al, chhal, kadech, wach…) and a
// few Arabic-script ones, because that is what lands in these inboxes.
// `weak: true` marks politeness rules (bonjour, merci): they only win when
// nothing else in the message matched.
export const RULES = [
  {
    intent: 'prix',
    label: 'Prix / tarifs',
    keywords: ['prix', 'tarif', 'tarifs', 'combien', 'coute', 'cout', 'couter', 'price',
      'chhal', 'ch7al', 'bch7al', 'bechhal', 'kadech', 'kaddech', 'kadesh', 'thaman',
      'سعر', 'بشحال', 'الثمن', 'كم'],
    reply: () => [
      '💰 *Nos tarifs* (prix unitaire, hors personnalisation spécifique) :',
      '',
      priceList(),
      '',
      `Remise volume automatique :`,
      discountList(),
      '',
      `Minimum de commande : *${MIN_ORDER} pièces*.`,
      `Catalogue complet : ${SITE}/catalogue`,
    ].join('\n'),
  },
  {
    intent: 'catalogue',
    label: 'Catalogue / produits',
    keywords: ['catalogue', 'produit', 'produits', 'modele', 'modeles', 'gamme', 'article',
      'articles', 'collection', 'vous avez', 'disponible', 'stock', 'tenue', 'tenues',
      'uniforme', 'uniformes', 'vetement', 'vetements'],
    reply: () => [
      '📒 *Notre catalogue* — uniformes et tenues de travail personnalisés :',
      '',
      priceList(),
      '',
      `Techniques de marquage : ${TECHNIQUES.join(', ')}.`,
      `Voir le détail et essayer votre logo : ${SITE}/catalogue`,
    ].join('\n'),
  },
  {
    intent: 'minimum',
    label: 'Minimum de commande',
    keywords: ['minimum', 'minimom', 'min', 'quantite minimum', 'moins de', 'une piece',
      'unite', 'petite quantite', 'juste 5', 'juste 10'],
    reply: () => [
      `📦 Le minimum de commande est de *${MIN_ORDER} pièces* (toutes tailles confondues).`,
      '',
      'En dessous, écrivez-nous quand même : nous étudions un devis personnalisé au cas par cas.',
      `👉 ${SITE}/devis`,
    ].join('\n'),
  },
  {
    intent: 'remise',
    label: 'Remises / gros volumes',
    keywords: ['remise', 'reduction', 'discount', 'promo', 'promotion', 'gros', 'grande quantite',
      'volume', 'grosse commande', 'tarif degressif', 'geste'],
    reply: () => [
      '🎁 *Remises volume* — appliquées automatiquement :',
      '',
      discountList(),
      '',
      'Et *−10 % supplémentaires* en cas de paiement anticipé (CCP / Baridimob ou CIB / Edahabia).',
      `Simulez votre total : ${SITE}/commande`,
    ].join('\n'),
  },
  {
    intent: 'delai',
    label: 'Délais',
    keywords: ['delai', 'delais', 'combien de temps', 'quand', 'duree', 'rapide', 'urgent',
      'jours', 'semaine', 'pret', 'wakt', 'waqt', 'chhal men wakt', 'وقت', 'متى'],
    reply: () => [
      '⏱️ *Nos délais :*',
      '• Confirmation et mise en production sous *48 h ouvrables*.',
      '• Réception : *3 à 7 jours ouvrables* selon la wilaya et la complexité du marquage.',
      '',
      'Une date précise vous est confirmée sur WhatsApp une fois le logo reçu.',
    ].join('\n'),
  },
  {
    intent: 'livraison',
    label: 'Livraison',
    keywords: ['livraison', 'livrer', 'livrez', 'expedition', 'expedier', 'envoi', 'envoyer',
      'wilaya', 'wilayas', 'stop desk', 'stopdesk', 'domicile', 'transporteur', 'colis'],
    reply: () => [
      '🚚 *Livraison dans les 58 wilayas*, à domicile ou en stop desk.',
      '',
      'Comptez 3 à 7 jours ouvrables après validation du bon à tirer.',
      `Indiquez votre wilaya dans le formulaire : ${SITE}/commande`,
    ].join('\n'),
  },
  {
    intent: 'paiement',
    label: 'Paiement',
    keywords: ['paiement', 'payer', 'paye', 'reglement', 'ccp', 'baridimob', 'baridi', 'cib',
      'edahabia', 'dahabia', 'versement', 'acompte', 'especes', 'cash', 'virement', 'khalas',
      'دفع', 'خلاص'],
    reply: () => [
      '💳 *Modes de paiement :*',
      '• À la livraison (standard).',
      '• CCP / Baridimob — *−10 %*.',
      '• CIB / Edahabia — *−10 %*.',
      '',
      'La remise paiement anticipé se cumule avec la remise volume.',
    ].join('\n'),
  },
  {
    intent: 'technique',
    label: 'Techniques de marquage',
    keywords: ['broderie', 'brodee', 'serigraphie', 'serigraphier', 'transfert', 'sublimation',
      'flocage', 'flex', 'marquage', 'impression', 'imprimer', 'technique', 'techniques',
      'floquer', 'personnalisation', 'personnaliser'],
    reply: () => [
      '🧵 *Nos techniques de marquage :*',
      '• *Broderie* — durable et haut de gamme (polos, chemises, vestes, casquettes).',
      '• *Sérigraphie* — idéale pour les grandes séries, couleurs franches.',
      '• *Transfert numérique* — logos complexes, couleurs exactes, délai rapide.',
      '• *Sublimation* — sur textile polyester, impression dans la fibre.',
      '• *Flocage* — effet velours, parfait pour les noms et numéros.',
      '',
      'Dites-nous le support et le logo : on vous conseille la technique la plus adaptée.',
    ].join('\n'),
  },
  {
    intent: 'logo',
    label: 'Logo / fichiers',
    keywords: ['logo', 'fichier', 'vectoriel', 'vectoriser', 'svg', 'png', 'pdf', 'ai',
      'illustrator', 'photoshop', 'psd', 'resolution', 'maquette', 'design', 'dpi', 'format'],
    reply: () => [
      '🖼️ *Votre logo :* envoyez-le en haute résolution — *SVG* de préférence, sinon *PNG 300 dpi minimum*.',
      '',
      'Si vous n\'avez qu\'une image basse définition, notre équipe peut le vectoriser.',
      `Vous pouvez aussi tester son placement en direct sur le produit : ${SITE}/catalogue`,
    ].join('\n'),
  },
  {
    intent: 'echantillon',
    label: 'Échantillon',
    keywords: ['echantillon', 'echantillons', 'sample', 'voir avant', 'exemple', 'realisation',
      'realisations', 'photo', 'photos', 'toucher', 'tester', 'essai'],
    handoff: true,
    reply: () => [
      '👀 Oui — avant tout engagement nous vous envoyons des photos de réalisations similaires à votre projet.',
      '',
      'Dites-nous le produit et la technique souhaités, un membre de l\'équipe vous envoie les visuels.',
    ].join('\n'),
  },
  {
    intent: 'contrat',
    label: 'Contrats / partenariats',
    keywords: ['contrat', 'contrats', 'annuel', 'annuelle', 'partenariat', 'partenaire',
      'fournisseur', 'long terme', 'recurrent', 'abonnement', 'appel d offre', 'marche public'],
    handoff: true,
    reply: () => [
      '🤝 Oui, nous travaillons avec des clients en *contrat annuel* et proposons des tarifs préférentiels pour les renouvellements réguliers.',
      '',
      'C\'est du sur-mesure : un responsable vous répond pour en discuter.',
    ].join('\n'),
  },
  {
    intent: 'devis',
    label: 'Devis',
    keywords: ['devis', 'estimation', 'proforma', 'facture', 'proposition', 'chiffrage', 'budget'],
    reply: () => [
      '📄 *Devis gratuit, réponse sous 24 h.*',
      '',
      `Remplissez le formulaire (produits, quantité, technique, délai) : ${SITE}/devis`,
      'Ou donnez-nous ici : le produit, la quantité et la technique — on vous chiffre ça.',
    ].join('\n'),
  },
  {
    intent: 'commander',
    label: 'Passer commande',
    keywords: ['commander', 'commande', 'commandes', 'acheter', 'achat', 'passer commande',
      'je veux', 'reserver', 'nchri', 'nekhdem'],
    reply: () => [
      '🛒 *Pour commander*, tout se fait en 3 étapes :',
      '1. Choisissez vos produits, tailles et quantités.',
      '2. Envoyez votre logo et choisissez la technique.',
      '3. Livraison et paiement — votre récapitulatif part sur WhatsApp.',
      '',
      `👉 ${SITE}/commande`,
      `Minimum ${MIN_ORDER} pièces. Vous recevez une référence *DP-XXXXXX* pour suivre la production.`,
    ].join('\n'),
  },
  {
    intent: 'horaires',
    label: 'Horaires',
    keywords: ['horaire', 'horaires', 'ouvert', 'ouverte', 'ouvrez', 'ferme', 'fermeture',
      'heure', 'heures', 'disponible quand', 'وقت العمل'],
    reply: () => [
      '🕗 *Nos horaires :*',
      '• Dimanche – Jeudi : 8h00 – 18h00',
      '• Vendredi : 8h00 – 12h00',
      '• Samedi : sur rendez-vous',
      '',
      'Les messages reçus en dehors de ces horaires sont traités à la réouverture.',
    ].join('\n'),
  },
  {
    intent: 'adresse',
    label: 'Adresse / atelier',
    keywords: ['adresse', 'ou etes', 'ou est', 'localisation', 'situe', 'atelier', 'magasin',
      'boutique', 'venir', 'passer vous voir', 'ain benian', 'alger', 'maps', 'وين'],
    reply: () => [
      `📍 Notre atelier : *${ADDRESS}*, Algérie.`,
      '',
      'Vous pouvez passer nous voir pendant les horaires d\'ouverture (dimanche–jeudi 8h–18h).',
      `Itinéraire et contact : ${SITE}/contact`,
    ].join('\n'),
  },
  {
    intent: 'contact',
    label: 'Coordonnées',
    keywords: ['numero', 'telephone', 'tel', 'portable', 'email', 'mail', 'adresse mail',
      'whatsapp', 'appeler', 'joindre', 'contacter', 'contact'],
    reply: () => [
      '📞 *Nos coordonnées :*',
      `• Téléphone / WhatsApp : ${PHONE_DISPLAY}`,
      `• Email : ${EMAIL}`,
      `• Atelier : ${ADDRESS}`,
      `• Site : ${SITE}`,
    ].join('\n'),
  },
  {
    intent: 'suivi',
    label: 'Suivi de commande',
    keywords: ['suivi', 'suivre', 'ou en est', 'ma commande', 'tracking', 'reference',
      'avancement', 'expediee', 'prete'],
    reply: () => [
      '🔎 *Suivi de commande :* envoyez-moi votre référence, au format *DP-XXXXXX*.',
      '',
      `Vous pouvez aussi la saisir ici : ${SITE}/suivi`,
    ].join('\n'),
  },
  {
    intent: 'humain',
    label: 'Parler à un humain',
    keywords: ['humain', 'humaine', 'quelqu un', 'personne reelle', 'responsable', 'gerant',
      'patron', 'agent', 'conseiller', 'robot', 'bot', 'parler a', 'appelez moi', 'rappel'],
    handoff: true,
    reply: () => 'Bien sûr — je transmets votre message à l\'équipe.',
  },
  {
    intent: 'merci',
    label: 'Remerciement',
    weak: true,
    keywords: ['merci', 'mercii', 'thanks', 'thank you', 'choukran', 'chokran', 'saha',
      'barak allah', 'baraka', 'شكرا', 'بارك'],
    reply: () => 'Avec plaisir 🙏 N\'hésitez pas si vous avez une autre question — et à bientôt chez Djimmy Prints.',
  },
  {
    intent: 'salutation',
    label: 'Salutation',
    weak: true,
    keywords: ['bonjour', 'bonsoir', 'salut', 'slt', 'bjr', 'bsr', 'salam', 'slm', 'salamou',
      'aslema', 'coucou', 'hello', 'hi', 'hey', 'sbah el kheir', 'sbah', 'masse el kheir',
      'سلام', 'صباح', 'مساء', 'اهلا'],
    reply: () => [
      '👋 Bonjour et bienvenue chez *Djimmy Prints* — uniformes et tenues de travail personnalisés (broderie, sérigraphie, transfert).',
      '',
      MENU,
    ].join('\n'),
  },
]

/* ─────────────────────────── détection d'intention ────────────────────── */

/**
 * Best-matching rule for a message, or null when nothing matches.
 * Score = number of distinct keywords found, weighted by keyword length so a
 * specific phrase ("stop desk") beats an incidental short word ("min").
 */
export function detectIntent(text) {
  const n = ` ${normalize(text)} `
  let best = null, bestScore = 0
  let bestStrong = null, bestStrongScore = 0

  for (const rule of RULES) {
    let score = 0
    for (const kw of rule.keywords) {
      const k = normalize(kw)
      // Word-boundary match on the normalised string: "min" must not fire
      // inside "minimum", nor "tel" inside "tellement".
      if (k && new RegExp(`(^| )${k}( |$)`).test(n)) {
        // Longer keywords are more specific, so they weigh a little more.
        score += 1 + k.length / 20
      }
    }
    if (score > bestScore) { bestScore = score; best = rule }
    if (score > bestStrongScore && !rule.weak) { bestStrongScore = score; bestStrong = rule }
  }

  // "Bonjour, vous livrez à Oran ?" opens with a greeting but asks about
  // delivery — a real question always beats the politeness that precedes it.
  if (best?.weak && bestStrong) return bestStrong
  return best
}

/* ──────────────────────────── réponse complète ────────────────────────── */

/**
 * Build the reply for one incoming message.
 *
 * @param {string} text            what the customer wrote
 * @param {{ now?: Date, channel?: string }} opts
 * @returns {{ intent: string, label: string, text: string, handoff: boolean, open: boolean }}
 */
export function buildReply(text, opts = {}) {
  const now = opts.now || new Date()
  const open = isOpen(now)

  const ref = matchRef(text)
  const product = matchProduct(text)
  const rule = detectIntent(text)

  let intent, label, body, handoff = false

  if (ref) {
    // A reference beats every other rule: it is the least ambiguous thing a
    // customer can send, and the answer is specific to them.
    intent = 'suivi_ref'
    label = 'Suivi (référence)'
    handoff = true
    body = [
      `🔎 Référence *${ref}* bien reçue.`,
      '',
      `Étapes de production : ${ORDER_STAGES.map(s => s.label).join(' → ')}.`,
      `Vous pouvez consulter votre suivi ici : ${SITE}/suivi`,
      '',
      'Je transmets à l\'atelier pour vous confirmer l\'étape exacte.',
    ].join('\n')
  } else if (product && (!rule || rule.intent === 'prix' || rule.intent === 'catalogue' || rule.intent === 'commander')) {
    // "Combien le polo ?" / just "polo" — answer about that product rather
    // than dumping the whole price list.
    intent = 'produit'
    label = `Produit : ${product.name}`
    body = productCard(product)
  } else if (rule) {
    intent = rule.intent
    label = rule.label
    handoff = Boolean(rule.handoff)
    body = rule.reply()
  } else {
    intent = 'inconnu'
    label = 'Non compris'
    handoff = true
    body = [
      'Merci pour votre message 🙏 Je n\'ai pas su y répondre automatiquement.',
      '',
      MENU,
    ].join('\n')
  }

  // Closing line: what happens next, honestly, given the hour it is.
  const tail = handoff
    ? (open
      ? '👤 Un membre de l\'équipe prend le relais dans quelques instants.'
      : `👤 Nous sommes actuellement fermés — un membre de l'équipe vous répond ${nextOpening(now)}.`)
    : (open ? '' : `🕗 Atelier fermé pour le moment — réponse humaine ${nextOpening(now)} si besoin.`)

  const full = [body, tail, `${AUTO_NOTE} · Djimmy Prints`]
    .filter(Boolean)
    .join('\n\n')

  return { intent, label, text: full, handoff, open }
}

/** Intent list, for the /bot console and the documentation. */
export const INTENT_LIST = RULES.map(r => ({ intent: r.intent, label: r.label }))
