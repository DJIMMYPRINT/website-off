import { getFees, yalidineConfigured, fromWilayaId } from '../../lib/yalidine'

// GET /api/shipping?wilaya=16  -> Yalidine delivery fees from the workshop
//                                 to that wilaya, home and stop desk.
//
// `wilaya` accepts either the bare id (16) or the label used in the order
// form ("16 Alger"), since WILAYAS in lib/constants.js carries the id as its
// two-digit prefix and the wizard passes the label straight through.
//
// Like /api/orders, an unconfigured integration answers 503 with
// { configured: false }: the wizard reads that as "no estimate available"
// and falls back to confirming the delivery cost on WhatsApp, exactly as it
// did before this route existed. It is never shown to the customer as an
// error.

const BUILD = (process.env.VERCEL_GIT_COMMIT_SHA || 'local').slice(0, 7)

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Méthode non autorisée.' })
  }

  if (!yalidineConfigured) {
    return res.status(503).json({ configured: false, build: BUILD })
  }

  // "16 Alger" -> 16, "16" -> 16.
  const id = Number(String(req.query.wilaya || '').trim().slice(0, 2))
  if (!Number.isInteger(id) || id < 1 || id > 58) {
    return res.status(400).json({ error: 'Wilaya invalide.' })
  }

  try {
    const fees = await getFees(id)
    // The grid changes a few times a year, so let Vercel's edge serve it and
    // keep the Yalidine quota for the parcel endpoints. stale-while-revalidate
    // means a customer never waits on a refresh.
    res.setHeader('Cache-Control', 'public, s-maxage=43200, stale-while-revalidate=86400')
    // `fees.from` is the wilaya *name* Yalidine echoes back; `fromId` is the
    // id we asked with. Keep both under distinct keys — spreading `fees` over
    // a `from` set here would silently drop one of them.
    return res.status(200).json({ configured: true, build: BUILD, ...fees, fromId: fromWilayaId })
  } catch (err) {
    console.error('[api/shipping]', err)
    // 502, not 500: the failure is upstream, and the wizard treats every
    // non-200 the same way — hide the estimate, keep the order flowing.
    return res.status(502).json({
      configured: true,
      build: BUILD,
      error: 'Estimation indisponible.',
      upstream: err.status ?? null,
      unrecognised: err.unrecognised || false,
    })
  }
}
