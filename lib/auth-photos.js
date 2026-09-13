import crypto from 'crypto'

// Accès à la bibliothèque de photos : un mot de passe unique, partagé.
//
// Pas de comptes ni de table utilisateurs — une seule personne s'en sert.
// Ce qui compte ici, c'est que la page ne soit pas en accès libre : elle
// donne des URL signées vers des photos de catalogue et des grilles de prix.
//
// Le cookie porte une date d'expiration et sa signature HMAC. Il n'est
// donc pas forgeable sans le mot de passe, et il ne contient pas le mot de
// passe lui-même — un cookie volé expire au bout de 30 jours et ne révèle
// rien de réutilisable ailleurs.

export const COOKIE = 'dp_photos'

const DUREE_JOURS = 30

const MOT_DE_PASSE = String(process.env.PHOTOS_PASSWORD || '')

export const authConfiguree = MOT_DE_PASSE.length > 0

function signer(expiration) {
  return crypto.createHmac('sha256', MOT_DE_PASSE).update(String(expiration)).digest('hex')
}

// Comparaison à temps constant. Sur un mot de passe court, un `===`
// laisserait fuiter sa longueur et ses premiers caractères par le temps
// de réponse ; ici la vérification coûte toujours pareil.
function egalConstant(a, b) {
  const ba = Buffer.from(String(a))
  const bb = Buffer.from(String(b))
  if (ba.length !== bb.length) return false
  return crypto.timingSafeEqual(ba, bb)
}

export function motDePasseValide(saisi) {
  if (!authConfiguree) return false
  return egalConstant(saisi || '', MOT_DE_PASSE)
}

export function creerCookie() {
  const expiration = Date.now() + DUREE_JOURS * 24 * 3600 * 1000
  const valeur = `${expiration}.${signer(expiration)}`
  const attributs = [
    `${COOKIE}=${valeur}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${DUREE_JOURS * 24 * 3600}`,
  ]
  // `Secure` casserait la connexion en développement sur http://localhost,
  // où le navigateur refuserait de renvoyer le cookie.
  if (process.env.NODE_ENV === 'production') attributs.push('Secure')
  return attributs.join('; ')
}

export function cookieExpire() {
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
}

export function estAutorise(req) {
  if (!authConfiguree) return false
  const brut = req.cookies?.[COOKIE]
  if (!brut) return false
  const [expiration, signature] = String(brut).split('.')
  if (!expiration || !signature) return false
  if (!/^\d+$/.test(expiration) || Number(expiration) < Date.now()) return false
  return egalConstant(signature, signer(expiration))
}

// Garde commune aux routes de la bibliothèque. Renvoie true si la requête
// peut continuer ; sinon elle a déjà répondu et l'appelant s'arrête.
export function refuserSiNonConnecte(req, res) {
  if (!authConfiguree) {
    res.status(503).json({ error: 'Bibliothèque non configurée : PHOTOS_PASSWORD manquant.' })
    return true
  }
  if (!estAutorise(req)) {
    res.status(401).json({ error: 'Non connecté.' })
    return true
  }
  return false
}
