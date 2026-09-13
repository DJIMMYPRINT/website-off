import { ALBUMS } from '../../../lib/albums'
import { changerAlbum, dbConfigured, supprimerPhoto } from '../../../lib/photos'
import { refuserSiNonConnecte } from '../../../lib/auth-photos'

// PATCH  /api/photos/:id  { album }  -> corrige un classement raté
// DELETE /api/photos/:id             -> retire la photo et son fichier

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function handler(req, res) {
  if (refuserSiNonConnecte(req, res)) return
  if (!dbConfigured) {
    return res.status(503).json({ error: 'Base non configurée : SUPABASE_SERVICE_ROLE_KEY manquante.' })
  }

  const id = String(req.query.id || '')
  if (!UUID.test(id)) return res.status(400).json({ error: 'Identifiant invalide.' })

  try {
    if (req.method === 'PATCH') {
      const { album, description } = req.body || {}
      // On n'accepte qu'un album de la liste : sinon un album fantôme
      // apparaîtrait dans les compteurs sans jamais être proposé au tri.
      if (!ALBUMS.includes(album)) return res.status(400).json({ error: 'Album inconnu.' })
      const photo = await changerAlbum(id, album, description)
      if (!photo) return res.status(404).json({ error: 'Photo introuvable.' })
      return res.status(200).json({ photo: { id: photo.id, album: photo.album } })
    }

    if (req.method === 'DELETE') {
      const supprimee = await supprimerPhoto(id)
      if (!supprimee) return res.status(404).json({ error: 'Photo introuvable.' })
      return res.status(200).json({ supprimee: true })
    }
  } catch (err) {
    console.error('[api/photos/:id]', err)
    return res.status(500).json({ error: 'Opération impossible.' })
  }

  res.setHeader('Allow', 'PATCH, DELETE')
  return res.status(405).json({ error: 'Méthode non autorisée.' })
}
