// Single source of truth for the product catalog.
// catalogue.js (full detail: desc, techniques, popular badge), commande.js
// (order wizard) and devis.js (quote request) all import this same array, so
// adding, removing, or repricing a product only needs to happen in one place
// instead of staying in sync across several files by hand.
export const PRODUCTS = [
  { emoji: '👕', name: 'Polo', price: 1200, desc: 'Piqué coton 220g/m². Col côtelé, fermeture 3 boutons.', techniques: ['Broderie','Sérigraphie','Transfert'], popular: true },
  { emoji: '🥼', name: 'Polo manches longues', price: 2700, desc: 'Piqué coton 220g/m² manches longues. Confort toute saison.', techniques: ['Broderie','Sérigraphie','Transfert'] },
  { emoji: '👕', name: 'T-shirt', price: 950, desc: 'Coton 180g/m². Col rond renforcé. Idéal pour équipes.', techniques: ['Sérigraphie','Transfert','Sublimation'] },
  { emoji: '👔', name: 'Chemise', price: 1800, desc: 'Popeline coton. Col classique. Finition professionnelle.', techniques: ['Broderie','Transfert'] },
  { emoji: '🧶', name: 'Sweat sans capuche', price: 2400, desc: 'Molleton gratté 280g/m². Col rond, poignets côtelés.', techniques: ['Broderie','Sérigraphie','Flocage'], popular: true },
  { emoji: '🧥', name: 'Sweat à capuche', price: 2800, desc: 'Molleton 320g/m². Capuche doublée, poche kangourou.', techniques: ['Broderie','Sérigraphie','Flocage'] },
  { emoji: '🧥', name: 'Veste', price: 3500, desc: 'Softshell imperméable. Idéal pour équipes terrain.', techniques: ['Broderie','Flocage'] },
  { emoji: '🥻', name: 'Tablier', price: 900, desc: 'Coton épais 280g/m². Protection totale, look cuisine pro.', techniques: ['Broderie','Sérigraphie'], popular: true },
  { emoji: '🦺', name: 'Gilet', price: 1400, desc: 'Polyester haute visibilité ou style corporate.', techniques: ['Broderie','Sérigraphie'] },
  { emoji: '🧢', name: 'Casquette', price: 650, desc: 'Coton structuré. Réglable, 6 panneaux.', techniques: ['Broderie','Flocage'] },
  { emoji: '👖', name: 'Pantalon', price: 2200, desc: 'Tissu pro résistant. Tailles S→3XL. Multiple coloris.', techniques: ['Broderie','Transfert'] },
]
