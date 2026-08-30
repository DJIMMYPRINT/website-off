// Local order book for the /suivi tracking page.
//
// The site has no backend by design (orders are placed and confirmed over
// WhatsApp), so there is nowhere central to look a reference up. What we can
// do honestly is keep a copy of what the visitor themselves submitted, on
// their own device, so /suivi can show them their reference, what they
// ordered, and where it sits in the production stages — and always hand them
// through to WhatsApp for the authoritative status.
//
// Every read and write is wrapped: localStorage throws outright in some
// privacy modes rather than returning null, and a tracking page that crashes
// is worse than one that shows an empty state.

const KEY = 'djimmy_orders_v1'

/** Reference shown to the customer and repeated in the WhatsApp message. */
export function newOrderRef() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no I/O/0/1 — read aloud over the phone
  let s = ''
  for (let i = 0; i < 6; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)]
  return `DP-${s}`
}

/** Normalise whatever the visitor types into the canonical DP-XXXXXX shape. */
export function normalizeRef(input) {
  const raw = String(input || '').trim().toUpperCase().replace(/\s+/g, '')
  const bare = raw.startsWith('DP-') ? raw.slice(3) : raw.startsWith('DP') ? raw.slice(2) : raw
  return bare ? `DP-${bare}` : ''
}

export function listOrders() {
  if (typeof window === 'undefined') return []
  try {
    const parsed = JSON.parse(window.localStorage.getItem(KEY) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveOrder(entry) {
  if (typeof window === 'undefined') return false
  try {
    // Newest first, and capped — this is a convenience cache, not an archive.
    const next = [entry, ...listOrders().filter(o => o.ref !== entry.ref)].slice(0, 25)
    window.localStorage.setItem(KEY, JSON.stringify(next))
    return true
  } catch {
    return false
  }
}

export function findOrder(ref) {
  const wanted = normalizeRef(ref)
  if (!wanted) return null
  return listOrders().find(o => o.ref === wanted) || null
}
