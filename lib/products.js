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
// `colors` is optional and holds the shades actually produced for that item,
// each with its own photo (cut from the studio contact sheets, see
// scripts/split-sheet.js). When present the product sheet swipes through
// those photos instead of offering the generic colour list; when absent the
// generic list in lib/constants.js applies. The first entry is the shade the
// grid thumbnail shows, so it is the best seller, not alphabetical.
export const PRODUCTS = [
  { emoji: '👕', name: 'Polo', photo: '/produits/polo/marine.jpg', price: 2400,
    desc: 'Piqué coton 220g/m². Col côtelé, fermeture 3 boutons.',
    techniques: ['Broderie','Sérigraphie','Transfert'], popular: true,
    colors: [
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
  { emoji: '🧥', name: 'Sweat à capuche',      photo: null,                 price: 2800, desc: 'Molleton 320g/m². Capuche doublée, poche kangourou.',        techniques: ['Broderie','Sérigraphie','Flocage'] },
  { emoji: '🥼', name: 'Combinaison',          photo: 'combinaison1.png',   price: 4900, desc: 'Combinaison de travail complète. Multipoches, résistante.',  techniques: ['Broderie','Sérigraphie'], popular: true },
  { emoji: '🧥', name: 'Veste',                photo: 'veste1.jpeg',        price: 3000, desc: 'Softshell imperméable. Idéal pour équipes terrain.',         techniques: ['Broderie','Flocage'] },
  { emoji: '👖', name: 'Pantalon',             photo: 'pantalon1.jpeg',     price: 2500, desc: 'Tissu pro résistant. Tailles S→3XL. Multiple coloris.',      techniques: ['Broderie','Transfert'] },
  { emoji: '🥻', name: 'Tablier',              photo: 'tablier1.jpeg',      price: 2200, desc: 'Coton épais 280g/m². Protection totale, look cuisine pro.',  techniques: ['Broderie','Sérigraphie'], popular: true },
  { emoji: '🦺', name: 'Gilet avec col', photo: '/produits/gilet-avec-col.jpg', price: 2700,
    desc: 'Gilet multipoches avec col. Style corporate ou terrain.',
    techniques: ['Broderie','Sérigraphie'],
    colors: [
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
    colors: [
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
  { emoji: '🧢', name: 'Casquette',            photo: 'casquette1.png',     price: 1150, desc: 'Coton structuré. Réglable, 6 panneaux.',                     techniques: ['Broderie','Flocage'] },
]
