import { listTasks, createTask, createNote, dbConfigured } from '../../../lib/atelier/db'

// GET  /api/tasks       -> les tâches ouvertes + celles cochées récemment
// POST /api/tasks       -> enregistre une tâche (et sa note, si fournie)
//
// Comme /api/orders : si la base n'est pas configurée, on répond 503 avec
// { configured: false }, que le client lit comme « garde la copie locale »
// et non comme une erreur à afficher. Une clé absente dégrade la
// synchronisation entre appareils, elle ne casse jamais la checklist.

const BUILD = (process.env.VERCEL_GIT_COMMIT_SHA || 'local').slice(0, 7)
const ID = /^[a-z]_[a-z0-9]{4,40}$/i

export default async function handler(req, res) {
  if (!dbConfigured) {
    return res.status(503).json({ configured: false, build: BUILD })
  }

  try {
    if (req.method === 'GET') {
      const rows = await listTasks({ since: null })
      return res.status(200).json({ configured: true, build: BUILD, tasks: rows || [] })
    }

    if (req.method === 'POST') {
      const { task, note } = req.body || {}
      if (!task || !ID.test(String(task.id || ''))) {
        return res.status(400).json({ error: 'Tâche invalide.' })
      }
      if (!String(task.titre || '').trim()) {
        return res.status(400).json({ error: 'Titre manquant.' })
      }
      if (note && ID.test(String(note.id || ''))) await createNote(note)
      const row = await createTask(task)
      return res.status(201).json({ configured: true, build: BUILD, task: row })
    }

    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ error: 'Méthode non autorisée.' })
  } catch (err) {
    console.error('[api/tasks]', err)
    return res.status(500).json({
      error: 'Erreur serveur.',
      build: BUILD,
      upstream: err.status || null,
      code: err.pgCode || null,
    })
  }
}
