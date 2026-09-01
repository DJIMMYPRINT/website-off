// Shared business constants used across pages/components.
// Single source of truth: change the phone/WhatsApp number here once and
// every page (nav CTA, home hero, contact page, order wizard) picks it up.
export const WA = '213560836384' // WhatsApp number, international format, no + or spaces
export const PHONE_DISPLAY = '0560 83 63 84'
export const EMAIL = 'djimmyprints@gmail.com'
export const ADDRESS = 'Aïn Bénian, Alger'
export const SITE_URL = 'djimmyprints.xyz'

export const WILAYAS = ['01 Adrar','02 Chlef','03 Laghouat','04 Oum El Bouaghi','05 Batna','06 Béjaïa','07 Biskra','08 Béchar','09 Blida','10 Bouira','11 Tamanrasset','12 Tébessa','13 Tlemcen','14 Tiaret','15 Tizi Ouzou','16 Alger','17 Djelfa','18 Jijel','19 Sétif','20 Saïda','21 Skikda','22 Sidi Bel Abbès','23 Annaba','24 Guelma','25 Constantine','26 Médéa','27 Mostaganem','28 M\'Sila','29 Mascara','30 Ouargla','31 Oran','32 El Bayadh','33 Illizi','34 Bordj Bou Arréridj','35 Boumerdès','36 El Tarf','37 Tindouf','38 Tissemsilt','39 El Oued','40 Khenchela','41 Souk Ahras','42 Tipaza','43 Mila','44 Aïn Defla','45 Naâma','46 Aïn Témouchent','47 Ghardaïa','48 Relizane','49 Timimoun','50 Bordj Badji Mokhtar','51 Ouled Djellal','52 Béni Abbès','53 In Salah','54 In Guezzam','55 Touggourt','56 Djanet','57 El M\'Ghair','58 El Meniaa']

// Product photos live in a SECOND Supabase project (ivxvzyokijsatdlonpec),
// public storage bucket IMAGE — separate from the dp-erp project used for
// order tracking. Two different projects, so two different sets of keys:
// mixing them up is what a 401 on /api/orders looks like.
export const SUPABASE_IMG_BASE = 'https://ivxvzyokijsatdlonpec.supabase.co/storage/v1/object/public/IMAGE'

export const SIZES = ['XS','S','M','L','XL','XXL','3XL']
export const COLORS = ['Blanc','Noir','Marine','Gris','Bordeaux','Vert bouteille','Beige','Bleu ciel','Jaune','Rouge','Personnalisée']
export const TECHNIQUES = ['Broderie','Sérigraphie','Transfert numérique','Sublimation','Flocage']

export const VOLUME_DISCOUNTS = [
  { qty: '20–49', dis: '0%', label: 'Tarif standard' },
  { qty: '50–99', dis: '5%', label: 'Remise volume' },
  { qty: '100–199', dis: '10%', label: 'Remise professionnelle' },
  { qty: '200+', dis: '15%', label: 'Tarif entreprise' },
]

// Ordered production stages shown on the /suivi tracking timeline.
// The business advances an order through these by hand over WhatsApp — there
// is no backend, so `suivi` reads the stage from the copy saved on the
// visitor's own device (see lib/orders.js) and always offers WhatsApp as the
// authoritative check.
export const ORDER_STAGES = [
  { key: 'recue',     ic: '📥', label: 'Commande reçue',   desc: 'Votre demande nous est parvenue sur WhatsApp.' },
  { key: 'confirmee', ic: '✅', label: 'Devis confirmé',   desc: 'Quantités, technique et prix validés avec vous.' },
  { key: 'production',ic: '🖨️', label: 'En production',    desc: 'Marquage en cours dans notre atelier.' },
  { key: 'expediee',  ic: '🚚', label: 'Expédiée',         desc: 'Remise au transporteur vers votre wilaya.' },
  { key: 'livree',    ic: '🎉', label: 'Livrée',           desc: 'Commande réceptionnée. Merci de votre confiance !' },
]

export const HOURS = [
  ['Dimanche – Jeudi', '8h00 – 18h00'],
  ['Vendredi', '8h00 – 12h00'],
  ['Samedi', 'Sur RDV'],
]

export const MIN_ORDER = 20
