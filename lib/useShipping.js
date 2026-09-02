import { useEffect, useState } from 'react'

// Delivery cost for a wilaya, read through /api/shipping so the Yalidine
// credentials stay on the server (see lib/yalidine.js).
//
// The order wizard and the quote form both need this. Keeping the fetch, the
// fallback and the formatting here means the two pages cannot drift apart —
// same rule as PRODUCTS in lib/products.js.
//
// The state machine is deliberately small:
//
//   idle     no wilaya chosen yet
//   loading  request in flight
//   ok       fees available (fees.communes may still be empty)
//   off      no credentials, Yalidine down, or a payload we don't recognise
//
// `off` is not an error to show the customer. Every caller simply hides the
// estimate and lets the order continue to WhatsApp, which is how the site
// behaved before this existed.
export function useShipping(wilaya) {
  const [ship, setShip] = useState({ state: 'idle' })

  useEffect(() => {
    if (!wilaya) { setShip({ state: 'idle' }); return }
    let alive = true
    setShip({ state: 'loading' })
    fetch(`/api/shipping?wilaya=${encodeURIComponent(wilaya)}`)
      .then(r => r.json().then(d => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!alive) return
        setShip(ok && (d.home || d.desk) ? { state: 'ok', fees: d } : { state: 'off' })
      })
      .catch(() => { if (alive) setShip({ state: 'off' }) })
    // A customer switching wilaya twice quickly must not have the first
    // response overwrite the second.
    return () => { alive = false }
  }, [wilaya])

  return ship
}

// Accepts either an exact amount (commune known) or a { min, max } span
// (wilaya known, commune not). Communes inside a wilaya are not priced alike,
// so the span is shown as a span rather than as its cheapest end.
export function fmtFee(v, loc) {
  if (typeof v === 'number') return v > 0 ? `${v.toLocaleString(loc)} DA` : null
  if (!v) return null
  return v.min === v.max
    ? `${v.min.toLocaleString(loc)} DA`
    : `${v.min.toLocaleString(loc)} – ${v.max.toLocaleString(loc)} DA`
}
