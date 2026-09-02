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
export const PRODUCTS = [
  { emoji: '👕', name: 'Polo',                 photo: '/produits/polo.jpg',         price: 2400, desc: 'Piqué coton 220g/m². Col côtelé, fermeture 3 boutons.',      techniques: ['Broderie','Sérigraphie','Transfert'], popular: true },
  { emoji: '🥼', name: 'Polo manches longues', photo: null,                 price: 2700, desc: 'Piqué coton 220g/m² manches longues. Confort toute saison.', techniques: ['Broderie','Sérigraphie','Transfert'] },
  { emoji: '👕', name: 'T-shirt',              photo: 'tshirt1.jpeg',       price: 1950, desc: 'Coton 180g/m². Col rond renforcé. Idéal pour équipes.',      techniques: ['Sérigraphie','Transfert','Sublimation'] },
  { emoji: '🧶', name: 'Sweat sans capuche',   photo: null,                 price: 2400, desc: 'Molleton gratté 280g/m². Col rond, poignets côtelés.',       techniques: ['Broderie','Sérigraphie','Flocage'] },
  { emoji: '🧥', name: 'Sweat à capuche',      photo: null,                 price: 2800, desc: 'Molleton 320g/m². Capuche doublée, poche kangourou.',        techniques: ['Broderie','Sérigraphie','Flocage'] },
  { emoji: '🥼', name: 'Combinaison',          photo: 'combinaison1.png',   price: 4900, desc: 'Combinaison de travail complète. Multipoches, résistante.',  techniques: ['Broderie','Sérigraphie'], popular: true },
  { emoji: '🧥', name: 'Veste',                photo: 'veste1.jpeg',        price: 3000, desc: 'Softshell imperméable. Idéal pour équipes terrain.',         techniques: ['Broderie','Flocage'] },
  { emoji: '👖', name: 'Pantalon',             photo: 'pantalon1.jpeg',     price: 2500, desc: 'Tissu pro résistant. Tailles S→3XL. Multiple coloris.',      techniques: ['Broderie','Transfert'] },
  { emoji: '🥻', name: 'Tablier',              photo: 'tablier1.jpeg',      price: 2200, desc: 'Coton épais 280g/m². Protection totale, look cuisine pro.',  techniques: ['Broderie','Sérigraphie'], popular: true },
  { emoji: '🦺', name: 'Gilet avec col',       photo: '/produits/gilet-avec-col.jpg', price: 2700, desc: 'Gilet multipoches avec col. Style corporate ou terrain.',    techniques: ['Broderie','Sérigraphie'] },
  { emoji: '🦺', name: 'Gilet sans col',       photo: '/produits/gilet-sans-col.jpg',        price: 2300, desc: 'Gilet multipoches sans col. Léger, coupe droite.',           techniques: ['Broderie','Sérigraphie'] },
  { emoji: '🧢', name: 'Casquette',            photo: 'casquette1.png',     price: 1150, desc: 'Coton structuré. Réglable, 6 panneaux.',                     techniques: ['Broderie','Flocage'] },
]
