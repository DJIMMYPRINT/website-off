import { authConfiguree, cookieExpire, creerCookie, estAutorise, motDePasseValide } from '../../../lib/auth-photos'

// GET    /api/photos/session -> { connecte: bool }
// POST   /api/photos/session -> ouvre la session (corps { motdepasse })
// DELETE /api/photos/session -> ferme la session

// Fenêtre de temporisation après un échec. Sans elle, un mot de passe
// unique et court serait attaquable par force brute à pleine vitesse.
const ATTENTE_MS = 1000

export default async function handler(req, res) {
  if (!authConfiguree) {
    return res.status(503).json({ error: 'Bibliothèque non configurée : PHOTOS_PASSWORD manquant.' })
  }

  if (req.method === 'GET') {
    return res.status(200).json({ connecte: estAutorise(req) })
  }

  if (req.method === 'POST') {
    if (motDePasseValide(req.body?.motdepasse)) {
      res.setHeader('Set-Cookie', creerCookie())
      return res.status(200).json({ connecte: true })
    }
    await new Promise((r) => setTimeout(r, ATTENTE_MS))
    return res.status(401).json({ error: 'Mot de passe incorrect.' })
  }

  if (req.method === 'DELETE') {
    res.setHeader('Set-Cookie', cookieExpire())
    return res.status(200).json({ connecte: false })
  }

  res.setHeader('Allow', 'GET, POST, DELETE')
  return res.status(405).json({ error: 'Méthode non autorisée.' })
}
