import Anthropic from '@anthropic-ai/sdk'
import { ALBUMS, FALLBACK_ALBUM, matchAlbum } from '../../lib/albums'

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

export const config = {
  // Nous lisons le flux nous-mêmes : le parseur de Next plafonne à 1 Mo
  // et refuserait une photo d'iPhone.
  api: { bodyParser: false },
}

const MODELE = process.env.CLASSIFY_MODEL || 'claude-opus-5'

// Format déduit des octets, pas de l'en-tête Content-Type : Raccourcis
// n'annonce pas toujours le type réel du fichier qu'il poste, et une photo
// correcte refusée sur la foi d'un en-tête approximatif serait un bug
// impossible à diagnostiquer depuis le téléphone.
function detecterType(buf) {
  if (buf.length < 12) return null
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg'
  if (buf.toString('latin1', 0, 8) === '\x89PNG\r\n\x1a\n') return 'image/png'
  if (buf.toString('latin1', 0, 6) === 'GIF87a' || buf.toString('latin1', 0, 6) === 'GIF89a') return 'image/gif'
  if (buf.toString('latin1', 0, 4) === 'RIFF' && buf.toString('latin1', 8, 12) === 'WEBP') return 'image/webp'
  return null
}

// Le HEIC de l'iPhone n'est pas accepté par l'API vision. On le reconnaît
// pour pouvoir dire quoi corriger dans le raccourci, au lieu de renvoyer
// un « format inconnu » que personne ne saurait interpréter.
function estHeic(buf) {
  if (buf.length < 12) return false
  if (buf.toString('latin1', 4, 8) !== 'ftyp') return false
  return ['heic', 'heix', 'hevc', 'mif1', 'msf1'].includes(buf.toString('latin1', 8, 12))
}

// L'API vision plafonne à 5 Mo par image. On refuse un peu avant, pour
// que le raccourci reçoive un message clair au lieu d'une erreur amont.
const TAILLE_MAX = 4 * 1024 * 1024

const CONSIGNE = `Tu ranges les photos d'un imprimeur de vêtements professionnels à Alger (Djimmy Prints).

Réponds UNIQUEMENT par le nom exact d'un album de cette liste, sans phrase, sans ponctuation, sans guillemets :
${ALBUMS.map((a) => `- ${a}`).join('\n')}

Règles :
- Vêtement porté, posé à plat ou en rayon -> l'album du type de vêtement.
- Un gilet de travail multipoches : « Gilet avec col » s'il a un col, « Gilet sans col » sinon. Regarde l'encolure avant de trancher.
- Page de catalogue, nuancier, planche de coloris -> Catalogues.
- Grille de prix, tarif, devis, capture de facture -> Tarifs.
- Logo, visuel de marque, fichier client à imprimer -> Logos clients.
- Vêtement déjà floqué/brodé, livraison, équipe en tenue, chantier -> Réalisations.
- Dans le doute, ou si ce n'est rien de tout ça -> ${FALLBACK_ALBUM}.

Ne choisis jamais un nom absent de la liste.`

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
  if (image.length === 0) return res.status(400).send('Photo vide.')

  const type = detecterType(image)
  if (!type) {
    return res
      .status(415)
      .send(
        estHeic(image)
          ? 'Photo en HEIC. Ajoute « Convertir l’image » en JPEG dans le raccourci, avant l’envoi.'
          : 'Ce fichier n’est pas une image JPEG, PNG, GIF ou WebP.'
      )
  }

  try {
    const client = new Anthropic()
    const reponse = await client.messages.create({
      model: MODELE,
      // La consigne tient en trois mots, mais la réflexion adaptative est
      // active par défaut sur Opus 5 et consomme aussi ce plafond : on
      // laisse de la marge plutôt que de tronquer la réponse.
      max_tokens: 2048,
      output_config: { effort: 'low' },
      system: CONSIGNE,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: type, data: image.toString('base64') } },
            { type: 'text', text: 'Dans quel album ranger cette photo ?' },
          ],
        },
      ],
    })

    if (reponse.stop_reason === 'refusal') {
      console.warn('[api/classify-photo] refus', reponse.stop_details)
      return res.status(200).send(FALLBACK_ALBUM)
    }

    const texte = reponse.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join(' ')

    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    // matchAlbum ne renvoie jamais autre chose qu'un album connu, donc le
    // raccourci n'a aucun cas d'erreur à gérer : il reçoit toujours un
    // nom qu'il sait ranger.
    return res.status(200).send(matchAlbum(texte))
  } catch (err) {
    console.error('[api/classify-photo]', err)
    if (err instanceof Anthropic.AuthenticationError) {
      return res.status(503).send('Clé Anthropic refusée.')
    }
    if (err instanceof Anthropic.RateLimitError) {
      return res.status(429).send('Trop de photos d’un coup. Réessaie dans une minute.')
    }
    return res.status(502).send('Le classement a échoué.')
  }
}
