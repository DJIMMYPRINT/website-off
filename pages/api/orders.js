import { createOrder, getOrder, dbConfigured, dbShape } from '../../lib/db'

// POST /api/orders        -> record an order placed through the wizard
// GET  /api/orders?ref=.. -> look one up by reference, from any device
//
// When the database is not configured this answers 503 with
// { configured: false }, which the pages read as "fall back to the copy
// kept on this device" rather than as an error to show the customer.

const REF = /^DP-[A-Z0-9]{4,12}$/

export default async function handler(req, res) {
  if (!dbConfigured) {
    return res.status(503).json({ configured: false })
  }

  try {
    if (req.method === 'POST') {
      const { ref, customer, items, total, technique, notes } = req.body || {}
      if (!REF.test(String(ref || '').toUpperCase())) {
        return res.status(400).json({ error: 'Référence invalide.' })
      }
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Commande vide.' })
      }
      const row = await createOrder({
        ref: String(ref).toUpperCase(), customer, items, total, technique, notes,
      })
      return res.status(201).json({ configured: true, order: row })
    }

    if (req.method === 'GET') {
      const ref = String(req.query.ref || '').toUpperCase().trim()
      if (!REF.test(ref)) return res.status(400).json({ error: 'Référence invalide.' })
      const row = await getOrder(ref)
      if (!row) return res.status(404).json({ configured: true, order: null })
      return res.status(200).json({ configured: true, order: row })
    }

    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ error: 'Méthode non autorisée.' })
  } catch (err) {
    // The full message goes to the server log only. The response carries the
    // upstream status and PostgREST error code — enough to tell a bad key
    // (401/403) from a stale schema cache (404/PGRST202) from an argument
    // mismatch (400), without echoing anything sensitive.
    console.error('[api/orders]', err)
    return res.status(500).json({
      error: 'Erreur serveur.',
      upstream: err.status || null,
      code: err.pgCode || null,
      errName: err.name || null,
      env: dbShape(),
    })
  }
}
