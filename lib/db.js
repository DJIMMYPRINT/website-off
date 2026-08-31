// Server-side Supabase access for order tracking.
//
// Two rules this file exists to enforce:
//
//  1. Never ship a Supabase key to the browser. Row Level Security is
//     currently disabled on the ERP tables in `public`, so the anon key
//     would expose Client/Facture/Paiement to anyone who opened devtools.
//     Only the service_role key is used, only here, only on the server.
//
//  2. Never make the site depend on it. If the env vars are absent the
//     helpers return null and the pages fall back to the on-device order
//     book (lib/orders.js), which is exactly how the site behaved before.
//     A missing key degrades tracking; it never breaks the site.
//
// The table lives in the `site` schema and is reached through three
// SECURITY DEFINER functions in `public` (site_order_create / _get /
// _set_stage), because PostgREST only exposes `public`.

const URL_ = process.env.SUPABASE_URL || ''
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

export const dbConfigured = Boolean(URL_ && KEY)

async function rpc(fn, args) {
  if (!dbConfigured) return null
  const res = await fetch(`${URL_}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args),
  })
  if (!res.ok) {
    throw new Error(`${fn} -> ${res.status} ${(await res.text()).slice(0, 200)}`)
  }
  const text = await res.text()
  return text ? JSON.parse(text) : null
}

export function createOrder({ ref, customer, items, total, technique, notes }) {
  return rpc('site_order_create', {
    p_ref: ref,
    p_customer: customer || {},
    p_items: items || [],
    p_total: Math.round(Number(total) || 0),
    p_technique: technique || null,
    p_notes: notes || null,
  })
}

export function getOrder(ref) {
  return rpc('site_order_get', { p_ref: ref })
}

export function setOrderStage(ref, stage) {
  return rpc('site_order_set_stage', { p_ref: ref, p_stage: stage })
}
