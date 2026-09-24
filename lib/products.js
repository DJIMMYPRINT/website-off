// Single source of truth for the product catalog.
//
// Prices, names and photos are taken from the live djimmyprints.xyz site
// (repo DJIMMYPRINT/djimmy-prints, lib/products.js) — the template this
// project started from carried an older price list that was roughly half
// the real figures, which would have been a serious error to publish.
//
// `photo` is a filename in the Supabase IMAGE bucket (see
// SUPABASE_IMG_BASE). Items without one fall back to their emoji, so a
// product can be listed before its photo has been shot.
//
// `variants` is optional and holds the versions actually produced for that
// item, each with its own photo (cut from the studio contact sheets, see
// scripts/split-sheet.js). When present the product sheet swipes through
// those photos instead of offering the generic colour list; when absent the
// generic list in lib/constants.js applies. The first entry is the one the
// grid thumbnail shows, so it is the best seller, not alphabetical.
//
// Usually a variant is a colour and carries `hex`, which the picker draws as
// a swatch. Where the versions differ in cut rather than colour — the three
// local work outfits are all the same navy — there is no `hex` and the picker
// shows the photos themselves, because three identical dots would tell a
// visitor nothing. `variantLabel` then renames the section accordingly.
//
// `sizes` overrides the garment size run for items that are not clothing —
// the tote bag comes in Petit/Moyen/Grand, not XS→3XL. `price` is then the
// cheapest combination and a colour may carry `prices` keyed by size, because
// the tote bag costs more in black than in écru and more in the larger cuts.
// Quoting one flat price there would under-bill every black bag sold.
// `pitch` replaces the shared workwear one-liner for items that are not
// garments.
export const PRODUCTS = [
  { emoji: '👕', name: 'Polo', photo: '/produits/polo/marine.jpg', price: 2400,
    desc: 'Piqué coton 220g/m². Col côtelé, fermeture 3 boutons.',
    techniques: ['Broderie','Sérigraphie','Transfert'], popular: true,
    variants: [
      { name: 'Marine', hex: '#1E2A4A', photo: '/produits/polo/marine.jpg' },
      { name: 'Noir', hex: '#141414', photo: '/produits/polo/noir.jpg' },
      { name: 'Blanc', hex: '#F1EFEC', photo: '/produits/polo/blanc.jpg' },
      { name: 'Gris', hex: '#A6A2A0', photo: '/produits/polo/gris.jpg' },
      { name: 'Bleu roi', hex: '#1D4FD8', photo: '/produits/polo/bleu.jpg' },
      { name: 'Vert bouteille', hex: '#1F5138', photo: '/produits/polo/vert.jpg' },
      { name: 'Rouge', hex: '#C41230', photo: '/produits/polo/rouge.jpg' },
      { name: 'Jaune', hex: '#F2CE2A', photo: '/produits/polo/jaune.jpg' },
      { name: 'Orange', hex: '#E8671B', photo: '/produits/polo/orange.jpg' },
    ] },
  { emoji: '🥼', name: 'Polo manches longues', photo: null,                 price: 2700, desc: 'Piqué coton 220g/m² manches longues. Confort toute saison.', techniques: ['Broderie','Sérigraphie','Transfert'] },
  { emoji: '👕', name: 'T-shirt',              photo: 'tshirt1.jpeg',       price: 1950, desc: 'Coton 180g/m². Col rond renforcé. Idéal pour équipes.',      techniques: ['Sérigraphie','Transfert','Sublimation'] },
  { emoji: '🧶', name: 'Sweat sans capuche',   photo: null,                 price: 2400, desc: 'Molleton gratté 280g/m². Col rond, poignets côtelés.',       techniques: ['Broderie','Sérigraphie','Flocage'] },
  { emoji: '🧥', name: 'Sweat-shirt Premium', photo: '/produits/sweat-premium/noir.jpg', price: 3800,
    desc: 'Molleton premium gratté, capuche doublée, poche kangourou. Coupe droite unisexe, finitions côtelées.',
    techniques: ['Broderie','Sérigraphie','Flocage','DTF'], popular: true,
    variants: [
      { name: 'Noir',           hex: '#222222', photo: '/produits/sweat-premium/noir.jpg' },
      { name: 'Marine',         hex: '#1C294C', photo: '/produits/sweat-premium/marine.jpg', simulated: true },
      { name: 'Gris',           hex: '#88888E', photo: '/produits/sweat-premium/gris.jpg', simulated: true },
      { name: 'Bleu roi',       hex: '#0B47B5', photo: '/produits/sweat-premium/bleu.jpg' },
      { name: 'Vert bouteille', hex: '#304832', photo: '/produits/sweat-premium/vert.jpg' },
      { name: 'Bordeaux',       hex: '#701225', photo: '/produits/sweat-premium/bordeaux.jpg', simulated: true },
      { name: 'Rouge',          hex: '#BE1520', photo: '/produits/sweat-premium/rouge.jpg', simulated: true },
    ] },
  { emoji: '🥼', name: 'Combinaison locale', photo: '/produits/combinaison/une-piece.jpg', price: 6900,
    desc: 'Fabrication locale. Tissu épais multipoches, bandes réfléchissantes, genoux renforcés. Trois modèles au choix.',
    techniques: ['Broderie','Sérigraphie'], popular: true,
    variantLabel: { one: 'Modèle', many: 'Modèles disponibles' },
    variants: [
      { name: 'Combinaison 1 pièce',  photo: '/produits/combinaison/une-piece.jpg' },
      { name: 'Salopette de travail', photo: '/produits/combinaison/salopette.jpg' },
      { name: 'Ensemble 2 pièces',    photo: '/produits/combinaison/deux-pieces.jpg' },
    ] },
  { emoji: '🧥', name: 'Veste',                photo: 'veste1.jpeg',        price: 3000, desc: 'Softshell imperméable. Idéal pour équipes terrain.',         techniques: ['Broderie','Flocage'] },
  { emoji: '👖', name: 'Pantalon',             photo: 'pantalon1.jpeg',     price: 2500, desc: 'Tissu pro résistant. Tailles S→3XL. Multiple coloris.',      techniques: ['Broderie','Transfert'] },
  { emoji: '🥻', name: 'Tablier',              photo: 'tablier1.jpeg',      price: 2200, desc: 'Coton épais 280g/m². Protection totale, look cuisine pro.',  techniques: ['Broderie','Sérigraphie'], popular: true },
  { emoji: '🦺', name: 'Gilet avec col', photo: '/produits/gilet-avec-col.jpg', price: 2700,
    desc: 'Gilet multipoches avec col. Style corporate ou terrain.',
    techniques: ['Broderie','Sérigraphie'],
    variants: [
      { name: 'Marine', hex: '#1B2338', photo: '/produits/gilet-avec-col/marine.jpg' },
      { name: 'Beige', hex: '#C3B2A2', photo: '/produits/gilet-avec-col/beige.jpg' },
      { name: 'Bleu roi', hex: '#1046C0', photo: '/produits/gilet-avec-col/royal.jpg' },
      { name: 'Vert', hex: '#0A8B78', photo: '/produits/gilet-avec-col/vert.jpg' },
      { name: 'Rouge', hex: '#A61224', photo: '/produits/gilet-avec-col/rouge.jpg' },
      { name: 'Jaune', hex: '#E1AD0C', photo: '/produits/gilet-avec-col/jaune.jpg' },
      { name: 'Jaune fluo', hex: '#DCE855', photo: '/produits/gilet-avec-col/jaune-fluo.jpg' },
    ] },
  { emoji: '🦺', name: 'Gilet sans col', photo: '/produits/gilet-sans-col/marine.jpg', price: 2300,
    desc: 'Gilet multipoches sans col. Léger, coupe droite.',
    techniques: ['Broderie','Sérigraphie'],
    variants: [
      { name: 'Marine', hex: '#252738', photo: '/produits/gilet-sans-col/marine.jpg' },
      { name: 'Noir', hex: '#1E1E1E', photo: '/produits/gilet-sans-col/noir.jpg' },
      { name: 'Gris', hex: '#6A6A6E', photo: '/produits/gilet-sans-col/gris.jpg' },
      { name: 'Kaki', hex: '#8E785A', photo: '/produits/gilet-sans-col/kaki.jpg' },
      { name: 'Bleu roi', hex: '#123CB0', photo: '/produits/gilet-sans-col/royal.jpg' },
      { name: 'Vert', hex: '#1F4A33', photo: '/produits/gilet-sans-col/vert.jpg' },
      { name: 'Rouge', hex: '#B50315', photo: '/produits/gilet-sans-col/rouge.jpg' },
      { name: 'Jaune', hex: '#EFB204', photo: '/produits/gilet-sans-col/jaune.jpg' },
      { name: 'Orange', hex: '#DD4305', photo: '/produits/gilet-sans-col/orange.jpg' },
    ] },
  { emoji: '🛍️', name: 'Tote bag coton', photo: '/produits/tote-bag/ecru.jpg', price: 200,
    desc: 'Toile de coton naturel, longues anses renforcées. Surface idéale pour un logo. Petit 30×25, Moyen 35×30, Grand 40×35 cm.',
    pitch: 'Réutilisable et écologique, résistant à un usage quotidien.',
    techniques: ['Sérigraphie','DTF','Broderie','Transfert'],
    sizes: ['Petit','Moyen','Grand'],
    variants: [
      { name: 'Écru', hex: '#EFE4D0', photo: '/produits/tote-bag/ecru.jpg',
        prices: { Petit: 200, Moyen: 250, Grand: 250 } },
      { name: 'Noir', hex: '#1A1A1A', photo: '/produits/tote-bag/noir.jpg',
        prices: { Petit: 300, Moyen: 350, Grand: 350 } },
    ] },
  { emoji: '🧢', name: 'Casquette',            photo: 'casquette1.png',     price: 1150, desc: 'Coton structuré. Réglable, 6 panneaux.',                     techniques: ['Broderie','Flocage'] },
]

// Unit price for one size of one variant. Almost every product has a single
// price; where a variant carries its own grid (the tote bag) that grid wins.
export function unitPrice(product, variantName, size) {
  const v = product.variants && product.variants.find(x => x.name === variantName)
  const p = v && v.prices && v.prices[size]
  return typeof p === 'number' ? p : product.price
}

// True when the product cannot be quoted with one number, so listings say
// "dès X DA" instead of stating a price the customer may not get.
export function hasPriceGrid(product) {
  return Boolean(product.variants && product.variants.some(v => v.prices))
}

// Cheapest and dearest a single piece can cost, across variants and sizes.
export function priceRange(product) {
  if (!hasPriceGrid(product)) return [product.price, product.price]
  const all = []
  for (const v of product.variants) {
    for (const p of Object.values(v.prices || {})) all.push(p)
    if (!v.prices) all.push(product.price)
  }
  return [Math.min(...all), Math.max(...all)]
}
