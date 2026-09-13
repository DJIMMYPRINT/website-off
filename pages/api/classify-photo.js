import Anthropic from '@anthropic-ai/sdk'
import { FALLBACK_ALBUM } from '../../lib/albums'
import { ErreurClassement, classer, validerImage, TAILLE_MAX } from '../../lib/classify'

// POST /api/classify-photo
//
// Corps  : les octets bruts d'une image JPEG, PNG, GIF ou WebP. Pas de
//          multipart : le raccourci iOS envoie le fichier tel quel, ce qui
//          évite de composer un formulaire à la main dans Raccourcis. Le
//          format est déduit des octets, pas de l'en-tête Content-Type.
// En-tête: x-cle-tri, la clé partagée avec le raccourci.
// Réponse: text/plain, le nom exact d'un album de lib/albums.js — rien
//          d'autre, pour que « Ajouter à l'album » puisse s'en servir
//          sans avoir à découper du JSON.
//
// L'endpoint est public (le site l'est), d'où la clé partagée : sans
// elle, n'importe qui pourrait faire tourner l'API sur notre compte.
//
// La bibliothèque web (/photos) passe par /api/photos, qui partage le
// même lib/classify.js : les deux entrées ne peuvent pas diverger.

export const config = {
  // Nous lisons le flux nous-mêmes : le parseur de Next plafonne à 1 Mo
  // et refuserait une photo d'iPhone.
  api: { bodyParser: false },
}

function lireCorps(req) {
  return new Promise((resolve, reject) => {
    const morceaux = []
    let taille = 0
    let depasse = false
    req.on('data', (m) => {
      taille += m.length
      // Au-delà de la limite on cesse de bufferiser, mais on laisse la
      // requête se terminer : couper la connexion ici (req.destroy())
      // empêcherait la réponse 413 de partir, et le raccourci verrait une
      // erreur réseau au lieu du message qui dit quoi corriger.
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
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).send('Méthode non autorisée.')
  }

  const attendue = process.env.CLASSIFY_SECRET
  if (!attendue) return res.status(503).send('Tri non configuré : CLASSIFY_SECRET manquant.')
  if (req.headers['x-cle-tri'] !== attendue) return res.status(401).send('Clé invalide.')
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).send('Tri non configuré : ANTHROPIC_API_KEY manquante.')
  }

  let image
  try {
    image = await lireCorps(req)
  } catch (err) {
    if (err.tropGros) {
      return res.status(413).send('Photo trop lourde. Ajoute « Redimensionner l’image » à 1024 px de large.')
    }
    console.error('[api/classify-photo] lecture', err)
    return res.status(400).send('Lecture de la photo impossible.')
  }

  let type
  try {
    type = validerImage(image)
  } catch (err) {
    if (err instanceof ErreurClassement) {
      // Le raccourci a son propre remède à proposer pour le HEIC : il peut
      // convertir, ce qu'un envoi depuis le web ne peut pas.
      const message =
        err.statut === 415 && err.message.startsWith('Photo en HEIC')
          ? 'Photo en HEIC. Ajoute « Convertir l’image » en JPEG dans le raccourci, avant l’envoi.'
          : err.message
      return res.status(err.statut).send(message)
    }
    throw err
  }

  try {
    const { album } = await classer(image, type)
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    // classer() ne renvoie jamais autre chose qu'un album connu, donc le
    // raccourci n'a aucun cas d'erreur à gérer : il reçoit toujours un
    // nom qu'il sait ranger.
    return res.status(200).send(album)
  } catch (err) {
    console.error('[api/classify-photo]', err)
    if (err instanceof Anthropic.AuthenticationError) {
      return res.status(503).send('Clé Anthropic refusée.')
    }
    if (err instanceof Anthropic.RateLimitError) {
      return res.status(429).send('Trop de photos d’un coup. Réessaie dans une minute.')
    }
    // Une photo non classée reste rangeable à la main : mieux vaut la
    // mettre dans « Autres » que faire échouer tout le lot du raccourci.
    return res.status(200).send(FALLBACK_ALBUM)
  }
}
