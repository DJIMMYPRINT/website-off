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

// Env values pasted through a dashboard routinely arrive with a trailing
// slash, surrounding quotes, or a stray newline. Any of those make fetch()
// throw before a request is even sent, which surfaces as an error with no
// HTTP status at all — so normalise here rather than debug it later.
function clean(v) {
  return String(v || '').trim().replace(/^["']|["']$/g, '')
}
// The project URL is not a secret — it ships in the client of any ordinary
// Supabase app, and it is already in this repo's README and .env.example.
// Only the service_role key is. So the URL gets a known-good default and
// the env var becomes an override: a typo there costs a failed deploy
// instead of silently breaking order tracking, which is exactly what
// happened when it was configuration-only.
const DEFAULT_URL = 'https://pmqdltywisvlmuuwcxpb.supabase.co'
const VALID_URL = /^https:\/\/[a-z0-9-]+\.supabase\.co$/

const envUrl = clean(process.env.SUPABASE_URL).replace(/\/+$/, '')
const urlFromEnv = VALID_URL.test(envUrl)
const URL_ = urlFromEnv ? envUrl : DEFAULT_URL
const KEY = clean(process.env.SUPABASE_SERVICE_ROLE_KEY)

if (envUrl && !urlFromEnv) {
  console.warn(`[db] SUPABASE_URL invalide (${envUrl.length} car.) — repli sur ${DEFAULT_URL}`)
}

export const dbConfigured = Boolean(KEY)


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
    // Keep the upstream status and PostgREST's error code on the error, so
    // /api/orders can report *why* it failed without echoing the response
    // body (which can contain the arguments that were sent).
    const raw = await res.text()
    let code = null
    try { code = JSON.parse(raw).code || null } catch { /* not JSON */ }
    const err = new Error(`${fn} -> ${res.status} ${raw.slice(0, 300)}`)
    err.status = res.status
    err.pgCode = code
    throw err
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
