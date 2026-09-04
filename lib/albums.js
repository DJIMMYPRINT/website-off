// Liste des albums de rangement, et l'appariement du libellé renvoyé par
// le modèle vers un nom d'album exact.
//
// Les albums produits sont dérivés de PRODUCTS : le catalogue reste la
// seule source de vérité, donc ajouter un produit ajoute son album sans
// toucher à ce fichier. Les albums non-produits couvrent le reste de ce
// qui traîne dans la galerie (catalogues fournisseurs, grilles de prix,
// logos envoyés par les clients, photos de commandes livrées).
import { PRODUCTS } from './products'

// Fourre-tout. Toute photo que le modèle ne sait pas classer atterrit ici
// plutôt que dans un album produit au hasard : un album « Autres » qu'on
// vide à la main coûte moins cher qu'un gilet rangé dans les casquettes.
export const FALLBACK_ALBUM = 'Autres'

export const EXTRA_ALBUMS = [
  'Catalogues',      // pages de catalogue fournisseur, nuanciers
  'Tarifs',          // grilles de prix, captures de devis
  'Logos clients',   // fichiers logo reçus par WhatsApp
  'Réalisations',    // pièces finies, livraisons, chantiers
  FALLBACK_ALBUM,
]

export const PRODUCT_ALBUMS = PRODUCTS.map((p) => p.name)

export const ALBUMS = [...PRODUCT_ALBUMS, ...EXTRA_ALBUMS]

// Minuscules, sans accents, sans ponctuation : « Gilet avec col »,
// « gilet-avec-col » et « GILET AVEC COL. » doivent tous tomber sur la
// même clé, parce qu'on ne contrôle pas la casse exacte du modèle.
function normalise(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

const BY_KEY = new Map(ALBUMS.map((name) => [normalise(name), name]))

// Même index, espaces retirés, pour rattraper « tshirt » -> « T-shirt ».
// Séparé de BY_KEY : la recherche par inclusion ci-dessous doit continuer
// à travailler sur des mots entiers, sinon « polo » matcherait au milieu
// de n'importe quelle suite de lettres.
const BY_SQUASHED = new Map(ALBUMS.map((name) => [normalise(name).replace(/ /g, ''), name]))

// Renvoie le nom d'album exact, ou FALLBACK_ALBUM si la réponse ne
// correspond à rien de connu. On n'accepte jamais un nom inventé : le
// raccourci ne sait ranger que dans les albums qu'il connaît déjà.
export function matchAlbum(raw) {
  const key = normalise(raw)
  if (!key) return FALLBACK_ALBUM
  if (BY_KEY.has(key)) return BY_KEY.get(key)

  const squashed = key.replace(/ /g, '')
  if (BY_SQUASHED.has(squashed)) return BY_SQUASHED.get(squashed)

  // Le modèle a répondu par une phrase (« Album : Gilet avec col »).
  // On cherche le nom d'album le plus long qui y est contenu, pour que
  // « gilet avec col » l'emporte sur « gilet » si les deux existent.
  let best = null
  for (const [k, name] of BY_KEY) {
    if (key.includes(k) && (!best || k.length > normalise(best).length)) best = name
  }
  return best || FALLBACK_ALBUM
}
