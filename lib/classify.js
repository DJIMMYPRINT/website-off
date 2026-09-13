import Anthropic from '@anthropic-ai/sdk'
import { ALBUMS, FALLBACK_ALBUM, matchAlbum, normalise } from './albums'

// Classement d'une photo : quel album, et une description courte.
//
// Partagé par les deux entrées du système, pour qu'elles ne dérivent
// jamais l'une de l'autre :
//   - /api/classify-photo, appelé par le raccourci iOS (album seul) ;
//   - /api/photos, l'envoi depuis la bibliothèque web (album + description).
//
// La description n'est pas décorative : c'est elle qui rend la recherche
// utile. « gilet jaune haute visibilité » se retrouve en tapant « jaune »,
// ce que le seul nom d'album ne permettrait pas.

const MODELE = process.env.CLASSIFY_MODEL || 'claude-opus-5'

// L'API vision plafonne à 5 Mo par image ; on refuse un peu avant pour
// renvoyer un message clair plutôt qu'une erreur amont.
export const TAILLE_MAX = 4 * 1024 * 1024

// Format déduit des octets, pas de l'en-tête Content-Type : Raccourcis
// n'annonce pas toujours le type réel du fichier qu'il poste, et une photo
// correcte refusée sur la foi d'un en-tête approximatif serait un bug
// impossible à diagnostiquer depuis le téléphone.
export function detecterType(buf) {
  if (buf.length < 12) return null
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg'
  if (buf.toString('latin1', 0, 8) === '\x89PNG\r\n\x1a\n') return 'image/png'
  if (buf.toString('latin1', 0, 6) === 'GIF87a' || buf.toString('latin1', 0, 6) === 'GIF89a') return 'image/gif'
  if (buf.toString('latin1', 0, 4) === 'RIFF' && buf.toString('latin1', 8, 12) === 'WEBP') return 'image/webp'
  return null
}

// Le HEIC de l'iPhone n'est pas accepté par l'API vision. On le reconnaît
// pour pouvoir dire quoi corriger, au lieu d'un « format inconnu » que
// personne ne saurait interpréter.
export function estHeic(buf) {
  if (buf.length < 12) return false
  if (buf.toString('latin1', 4, 8) !== 'ftyp') return false
  return ['heic', 'heix', 'hevc', 'mif1', 'msf1'].includes(buf.toString('latin1', 8, 12))
}

const CONSIGNE = `Tu ranges les photos d'un imprimeur de vêtements professionnels à Alger (Djimmy Prints).

Réponds en exactement deux lignes, sans introduction ni ponctuation ajoutée.

Ligne 1 : le nom exact d'un album de cette liste, rien d'autre :
${ALBUMS.map((a) => `- ${a}`).join('\n')}

Ligne 2 : une description de 5 à 12 mots en français, qui servira à retrouver
la photo par recherche. Mentionne le type de pièce, la ou les couleurs, et un
détail distinctif visible (col, poches, logo, bandes réfléchissantes).

Règles pour la ligne 1 :
- Vêtement porté, posé à plat ou en rayon -> l'album du type de vêtement.
- Un gilet de travail multipoches : « Gilet avec col » s'il a un col, « Gilet sans col » sinon. Regarde l'encolure avant de trancher.
- Page de catalogue, nuancier, planche de coloris -> Catalogues.
- Grille de prix, tarif, devis, capture de facture -> Tarifs.
- Logo, visuel de marque, fichier client à imprimer -> Logos clients.
- Vêtement déjà floqué/brodé, livraison, équipe en tenue, chantier -> Réalisations.
- Dans le doute, ou si ce n'est rien de tout ça -> ${FALLBACK_ALBUM}.

Ne choisis jamais un nom absent de la liste.`

// Erreur porteuse d'un statut HTTP, pour que les routes se contentent de
// la relayer sans réinterpréter ce qui s'est passé.
export class ErreurClassement extends Error {
  constructor(statut, message) {
    super(message)
    this.statut = statut
  }
}

// Valide les octets reçus et renvoie le type MIME, ou lève une
// ErreurClassement dont le message dit quoi corriger.
export function validerImage(buf) {
  if (!buf || buf.length === 0) throw new ErreurClassement(400, 'Photo vide.')
  if (buf.length > TAILLE_MAX) {
    throw new ErreurClassement(413, 'Photo trop lourde (4 Mo maximum). Réduis-la avant l’envoi.')
  }
  const type = detecterType(buf)
  if (type) return type
  throw new ErreurClassement(
    415,
    estHeic(buf)
      ? 'Photo en HEIC. Convertis-la en JPEG avant l’envoi.'
      : 'Ce fichier n’est pas une image JPEG, PNG, GIF ou WebP.'
  )
}

// Renvoie { album, description }. L'album est toujours l'un de ceux que
// connaît lib/albums.js — jamais un nom inventé par le modèle.
export async function classer(image, type) {
  const client = new Anthropic()
  const reponse = await client.messages.create({
    model: MODELE,
    // La réponse tient en deux lignes, mais la réflexion adaptative est
    // active par défaut sur Opus 5 et consomme aussi ce plafond : on
    // laisse de la marge plutôt que de tronquer.
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
    console.warn('[classify] refus', reponse.stop_details)
    return { album: FALLBACK_ALBUM, description: '' }
  }

  const texte = reponse.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n')

  // Deux lignes attendues. Si le modèle n'en renvoie qu'une, matchAlbum
  // récupère quand même l'album et la description reste vide : la photo
  // est rangée, seulement moins facile à retrouver par mot-clé.
  const lignes = texte.split('\n').map((l) => l.trim()).filter(Boolean)
  return {
    album: matchAlbum(lignes[0] || ''),
    description: (lignes[1] || '').replace(/^["'«»\s-]+|["'«»\s]+$/g, '').slice(0, 200),
  }
}

// Clé de recherche : minuscules, sans accents. Stockée à part pour que
// « realisations » retrouve « Réalisations » sans dépendre de l'extension
// unaccent côté base.
export function cleRecherche(album, description) {
  return normalise(`${album} ${description}`)
}
