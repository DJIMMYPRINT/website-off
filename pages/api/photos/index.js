import Anthropic from '@anthropic-ai/sdk'
import { ALBUMS } from '../../../lib/albums'
import { ErreurClassement, classer, validerImage, TAILLE_MAX } from '../../../lib/classify'
import { avecUrls, compterParAlbum, dbConfigured, enregistrerPhoto, listerPhotos } from '../../../lib/photos'
import { refuserSiNonConnecte } from '../../../lib/auth-photos'

// GET  /api/photos?album=&q=&decalage=  -> la grille, avec URL signées
// POST /api/photos                      -> envoie une photo (octets bruts)
//
// L'envoi prend les octets bruts plutôt qu'un multipart : le navigateur
// poste un File directement en corps de requête, et la route partage ainsi
// exactement le même chemin de validation que le raccourci iOS.

export const config = {
  // On lit le flux nous-mêmes pour l'envoi ; le plafond de 1 Mo du parseur
  // de Next refuserait une photo. Le GET n'a pas de corps, donc rien à
  // parser de toute façon.
  api: { bodyParser: false },
}

const PAR_PAGE = 60

function lireCorps(req) {
  return new Promise((resolve, reject) => {
    const morceaux = []
    let taille = 0
    let depasse = false
    req.on('data', (m) => {
      taille += m.length
      // On cesse de bufferiser sans couper la connexion, pour que la
      // réponse 413 parte bien au lieu d'une erreur réseau opaque.
      if (taille > TAILLE_MAX) {
        depasse = true
        morceaux.length = 0
        return
      }
      if (!depasse) morceaux.push(m)
    })
    req.on('end', () => {
      if (depasse) return reject(Object.assign(new Error('trop volumineux'), { tropGros: true }))
      resolve(Buffer.concat(morceaux))
    })
    req.on('error', reject)
  })
}

export default async function handler(req, res) {
  if (refuserSiNonConnecte(req, res)) return
  if (!dbConfigured) {
    return res.status(503).json({ error: 'Base non configurée : SUPABASE_SERVICE_ROLE_KEY manquante.' })
  }

  if (req.method === 'GET') {
    try {
      const album = String(req.query.album || '')
      const q = String(req.query.q || '')
      const decalage = Math.max(0, parseInt(req.query.decalage, 10) || 0)

      const [lignes, compteurs] = await Promise.all([
        listerPhotos({ album, recherche: q, limite: PAR_PAGE, decalage }),
        compterParAlbum(),
      ])
      const photos = await avecUrls(lignes)

      return res.status(200).json({
        photos,
        // `encore` dit à l'interface s'il reste une page à charger, sans
        // avoir à compter la table entière à chaque requête.
        encore: photos.length === PAR_PAGE,
        albums: ALBUMS,
        compteurs: compteurs || [],
      })
    } catch (err) {
      console.error('[api/photos] GET', err)
      return res.status(500).json({ error: 'Lecture de la bibliothèque impossible.' })
    }
  }

  if (req.method === 'POST') {
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(503).json({ error: 'Classement non configuré : ANTHROPIC_API_KEY manquante.' })
    }

    let image
    try {
      image = await lireCorps(req)
    } catch (err) {
      if (err.tropGros) {
        return res.status(413).json({ error: 'Photo trop lourde (4 Mo maximum).' })
      }
      console.error('[api/photos] lecture', err)
      return res.status(400).json({ error: 'Lecture de la photo impossible.' })
    }

    let type
    try {
      type = validerImage(image)
    } catch (err) {
      if (err instanceof ErreurClassement) return res.status(err.statut).json({ error: err.message })
      throw err
    }

    try {
      const { album, description } = await classer(image, type)
      const ligne = await enregistrerPhoto({ image, type, album, description })
      const [photo] = await avecUrls([ligne])
      return res.status(201).json({ photo })
    } catch (err) {
      console.error('[api/photos] POST', err)
      if (err instanceof Anthropic.AuthenticationError) {
        return res.status(503).json({ error: 'Clé Anthropic refusée.' })
      }
      if (err instanceof Anthropic.RateLimitError) {
        return res.status(429).json({ error: 'Trop de photos d’un coup. Réessaie dans une minute.' })
      }
      return res.status(502).json({ error: 'Enregistrement impossible.' })
    }
  }

  res.setHeader('Allow', 'GET, POST')
  return res.status(405).json({ error: 'Méthode non autorisée.' })
}
