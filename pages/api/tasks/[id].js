import { updateTask, deleteTask, dbConfigured } from '../../../lib/atelier/db'

// PATCH  /api/tasks/:id  -> cocher, reporter, renommer, sortir de la revue
// DELETE /api/tasks/:id  -> supprimer

const BUILD = (process.env.VERCEL_GIT_COMMIT_SHA || 'local').slice(0, 7)
const ID = /^[a-z]_[a-z0-9]{4,40}$/i
const DAY = /^\d{4}-\d{2}-\d{2}$/

export default async function handler(req, res) {
  if (!dbConfigured) {
    return res.status(503).json({ configured: false, build: BUILD })
  }

  const id = String(req.query.id || '')
  if (!ID.test(id)) return res.status(400).json({ error: 'Identifiant invalide.' })

  try {
    if (req.method === 'PATCH') {
      const body = req.body || {}
      const patch = {}
      if (typeof body.done === 'boolean') patch.done = body.done
      if (typeof body.needs_review === 'boolean') patch.needs_review = body.needs_review
      if (typeof body.titre === 'string' && body.titre.trim()) patch.titre = body.titre.trim().slice(0, 140)
      if (body.due_date === null || DAY.test(String(body.due_date || ''))) patch.due_date = body.due_date ?? null
      if (!Object.keys(patch).length) return res.status(400).json({ error: 'Rien à modifier.' })

      const row = await updateTask(id, patch)
      return res.status(200).json({ configured: true, build: BUILD, task: row })
    }

    if (req.method === 'DELETE') {
      await deleteTask(id)
      return res.status(200).json({ configured: true, build: BUILD })
    }

    res.setHeader('Allow', 'PATCH, DELETE')
    return res.status(405).json({ error: 'Méthode non autorisée.' })
  } catch (err) {
    console.error('[api/tasks/:id]', err)
    return res.status(500).json({
      error: 'Erreur serveur.',
      build: BUILD,
      upstream: err.status || null,
      code: err.pgCode || null,
    })
  }
}
