// Server-side Yalidine access for showing real delivery costs per wilaya.
//
// Same three rules as lib/db.js, for the same reasons:
//
//  1. The API credentials never reach the browser. Yalidine's token is not
//     scoped to a read-only role — it can create, edit and delete parcels on
//     the account. It lives here, on the server, and nowhere else.
//
//  2. The site never depends on it. No credentials, Yalidine down, quota
//     exhausted: the helpers throw or report "not configured", /api/shipping
//     answers accordingly, and the order wizard simply says the delivery cost
//     is confirmed on WhatsApp — which is exactly how it behaved before.
//     A missing key degrades the estimate; it never blocks an order.
//
//  3. The response shape is not trusted blindly. Yalidine's documentation
//     lives behind the client area, and the payload has changed field names
//     between agents (yalidine / goupex) in the past. So the normaliser below
//     accepts several spellings and reports honestly when it recognises
//     nothing, instead of silently rendering "0 DA" — a wrong price shown to
//     a customer is worse than no price at all.

// Overridable because the same API serves a second agent (Goupex) from a
// different host, and because it is the only way to exercise this module
// against a mock instead of burning real quota.
const BASE = String(process.env.YALIDINE_BASE_URL || 'https://api.yalidine.app/v1')
  .trim().replace(/\/+$/, '')

// Env values pasted through a dashboard routinely arrive with a trailing
// slash, surrounding quotes, or a stray newline — any of which make fetch()
// throw before a request is sent. Normalise here rather than debug it later.
function clean(v) {
  return String(v || '').trim().replace(/^["']|["']$/g, '')
}

const API_ID = clean(process.env.YALIDINE_API_ID)
const API_TOKEN = clean(process.env.YALIDINE_API_TOKEN)

// Where the parcels leave from. The workshop is in Aïn Bénian, wilaya 16
// (Alger), so that is the default; the env var only exists so a second
// pickup point does not require a code change.
const FROM = Number(clean(process.env.YALIDINE_FROM_WILAYA_ID)) || 16

export const yalidineConfigured = Boolean(API_ID && API_TOKEN)
export const fromWilayaId = FROM

// Yalidine enforces a strict request quota per account (both per minute and
// per day), and delivery grids change a few times a year at most. Caching a
// wilaya for half a day turns "every visitor who picks a wilaya" into "one
// request per wilaya per half-day", which keeps the quota for the parcel
// endpoints that actually need it.
const TTL = 12 * 60 * 60 * 1000
const cache = new Map()

// --- Response normalisation -------------------------------------------------

// Known spellings for the two delivery modes, most specific first.
const HOME_KEYS = ['express_home', 'home', 'livraison_domicile', 'domicile']
const DESK_KEYS = ['express_desk', 'desk', 'livraison_stopdesk', 'stopdesk', 'bureau']

function pickNum(obj, keys) {
  if (!obj || typeof obj !== 'object') return null
  for (const k of keys) {
    const v = obj[k]
    if (typeof v === 'number' && v > 0) return v
    // Some responses return the amount as a numeric string.
    if (typeof v === 'string' && v.trim() !== '' && Number(v) > 0) return Number(v)
  }
  return null
}

// A wilaya holds many communes and their fees differ, but the order form only
// asks for a wilaya (plus a free-text address). So the honest thing to show is
// the span across that wilaya's communes, not one commune's price passed off
// as the wilaya's.
function span(values) {
  const v = values.filter(n => typeof n === 'number' && n > 0)
  if (!v.length) return null
  return { min: Math.min(...v), max: Math.max(...v) }
}

function normalise(raw) {
  // `per_commune` is an object keyed by commune id, but an array is cheap to
  // support and costs nothing if it never appears.
  const bucket = raw && raw.per_commune
  const rows = Array.isArray(bucket)
    ? bucket
    : bucket && typeof bucket === 'object'
      ? Object.values(bucket)
      : []

  // Sent to the browser so the order form can offer the commune and quote an
  // exact fee instead of the wilaya-wide span. Rows with no usable price are
  // dropped rather than shown as an option that resolves to nothing.
  const communes = rows
    .map(c => ({
      id: c.commune_id ?? c.id ?? null,
      name: c.commune_name || c.name || null,
      home: pickNum(c, HOME_KEYS),
      desk: pickNum(c, DESK_KEYS),
    }))
    .filter(c => c.name && (c.home || c.desk))
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'))

  let home = span(communes.map(c => c.home))
  let desk = span(communes.map(c => c.desk))

  // Fall back to a flat, wilaya-level payload if there is no commune detail.
  if (!home) {
    const n = pickNum(raw, HOME_KEYS)
    if (n) home = { min: n, max: n }
  }
  if (!desk) {
    const n = pickNum(raw, DESK_KEYS)
    if (n) desk = { min: n, max: n }
  }

  // Nothing recognisable came back. Say so — do not invent a zero.
  if (!home && !desk) {
    const err = new Error(`réponse Yalidine non reconnue (clés: ${Object.keys(raw || {}).slice(0, 12).join(', ') || 'aucune'})`)
    err.unrecognised = true
    throw err
  }

  return {
    from: raw.from_wilaya_name || null,
    to: raw.to_wilaya_name || null,
    zone: typeof raw.zone === 'number' ? raw.zone : null,
    home,
    desk,
    // Surcharge per extra kilo beyond the included weight. A 200-polo order
    // is several parcels well over that limit, so the wizard shows this
    // rather than pretending the base fee is the final price.
    oversize: pickNum(raw, ['oversize_fee']),
    communes,
  }
}

// --- Public API -------------------------------------------------------------

export async function getFees(toWilayaId) {
  const to = Number(toWilayaId)
  if (!Number.isInteger(to) || to < 1 || to > 58) {
    const err = new Error(`wilaya invalide: ${toWilayaId}`)
    err.status = 400
    throw err
  }
  if (!yalidineConfigured) return null

  const hit = cache.get(to)
  if (hit && Date.now() - hit.at < TTL) return hit.value

  let res
  try {
    res = await fetch(`${BASE}/fees/?from_wilaya_id=${FROM}&to_wilaya_id=${to}`, {
      headers: { 'X-API-ID': API_ID, 'X-API-TOKEN': API_TOKEN },
    })
  } catch (cause) {
    // fetch() throwing means the request never left — DNS, TLS, a malformed
    // base URL. There is no HTTP status to report, so name that explicitly.
    const err = new Error(`Yalidine injoignable: ${cause.message}`)
    err.status = 0
    throw err
  }

  if (!res.ok) {
    // The body can echo the credentials back in an error envelope, so keep
    // the status and a short excerpt only.
    const raw = await res.text()
    const err = new Error(`fees -> ${res.status} ${raw.slice(0, 200)}`)
    err.status = res.status
    throw err
  }

  const value = normalise(await res.json())
  cache.set(to, { at: Date.now(), value })
  return value
}
