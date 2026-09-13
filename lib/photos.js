import { rpc, storageRequest, dbConfigured, SUPABASE_URL_RESOLU } from './db'
import { cleRecherche } from './classify'
import { normalise } from './albums'

// Bibliothèque de photos produit : stockage des fichiers et lignes de
// métadonnées. Le classement lui-même est dans lib/classify.js.
//
// Le bucket est privé — ce sont des données commerciales, pas du contenu
// public. Les fichiers ne sortent que par URL signée, générée ici, côté
// serveur, et valable une heure.

export const BUCKET = 'catalogue-photos'

// Une heure : assez pour consulter la bibliothèque et envoyer une photo à
// un client sans regénérer, trop court pour qu'un lien qui traîne dans un
// historique WhatsApp reste ouvert indéfiniment.
const VALIDITE_SIGNATURE = 3600

export { dbConfigured }

const EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
}

// Chemin rangé par mois, pour que le bucket reste lisible dans le
// dashboard Supabase quand il y aura des milliers de fichiers.
function nouveauChemin(album, type) {
  const d = new Date()
  const mois = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  const slug = normalise(album).replace(/ /g, '-') || 'autres'
  // crypto.randomUUID évite toute collision, et surtout empêche de
  // deviner l'URL d'une photo à partir de celle d'une autre.
  return `${mois}/${slug}/${crypto.randomUUID()}.${EXTENSIONS[type] || 'jpg'}`
}

// Envoie les octets dans le bucket puis enregistre la ligne. En cas
// d'échec de l'enregistrement, le fichier déjà téléversé est retiré :
// sans ça le bucket accumulerait des orphelins invisibles depuis l'app.
export async function enregistrerPhoto({ image, type, album, description }) {
  const chemin = nouveauChemin(album, type)

  const envoi = await storageRequest(`object/${BUCKET}/${chemin}`, {
    method: 'POST',
    headers: { 'Content-Type': type, 'cache-control': 'max-age=3600' },
    body: image,
  })
  if (!envoi || !envoi.ok) {
    const detail = envoi ? `${envoi.status} ${(await envoi.text()).slice(0, 200)}` : 'base non configurée'
    throw new Error(`téléversement -> ${detail}`)
  }

  try {
    return await rpc('site_photo_create', {
      p_chemin: chemin,
      p_album: album,
      p_description: description,
      p_recherche: cleRecherche(album, description),
      p_type_mime: type,
      p_taille_octets: image.length,
    })
  } catch (err) {
    await storageRequest(`object/${BUCKET}/${chemin}`, { method: 'DELETE' }).catch(() => {})
    throw err
  }
}

export function listerPhotos({ album = '', recherche = '', limite = 60, decalage = 0 } = {}) {
  return rpc('site_photo_list', {
    p_album: album,
    // La colonne `recherche` est normalisée en base ; la requête doit
    // l'être aussi, sinon « Réalisations » ne trouverait rien.
    p_recherche: normalise(recherche),
    p_limite: limite,
    p_decalage: decalage,
  })
}

export function compterParAlbum() {
  return rpc('site_photo_counts', {})
}

export function changerAlbum(id, album, description) {
  return rpc('site_photo_set_album', {
    p_id: id,
    p_album: album,
    p_recherche: cleRecherche(album, description || ''),
  })
}

export async function supprimerPhoto(id) {
  const chemin = await rpc('site_photo_delete', { p_id: id })
  if (!chemin) return false
  // La ligne est déjà partie : si le fichier résiste, on le signale sans
  // faire échouer la suppression, sinon la photo réapparaîtrait dans
  // l'interface alors que l'utilisateur l'a bien supprimée.
  const res = await storageRequest(`object/${BUCKET}/${chemin}`, { method: 'DELETE' })
  if (!res || !res.ok) console.warn('[photos] fichier non supprimé', chemin, res && res.status)
  return true
}

// URL signée pour un chemin du bucket. Renvoie null plutôt que de lever :
// une vignette manquante ne doit pas faire échouer toute la grille.
export async function urlSignee(chemin) {
  const res = await storageRequest(`object/sign/${BUCKET}/${chemin}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ expiresIn: VALIDITE_SIGNATURE }),
  })
  if (!res || !res.ok) {
    console.warn('[photos] signature impossible', chemin, res && res.status)
    return null
  }
  const { signedURL } = await res.json()
  // Supabase renvoie un chemin relatif ; on le rend absolu pour le
  // navigateur, qui n'a pas connaissance de l'URL du projet.
  return signedURL ? `${SUPABASE_URL_RESOLU}/storage/v1${signedURL}` : null
}

// Signe une liste de photos d'un coup. Les signatures partent en
// parallèle : sur une grille de 60 vignettes, les faire en série
// ajouterait plusieurs secondes au chargement.
export async function avecUrls(photos) {
  if (!Array.isArray(photos)) return []
  return Promise.all(
    photos.map(async (p) => ({
      id: p.id,
      album: p.album,
      description: p.description,
      cree_le: p.cree_le,
      url: await urlSignee(p.chemin),
    }))
  )
}
