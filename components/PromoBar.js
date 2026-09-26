import Link from 'next/link'
import { VOLUME_DISCOUNTS } from '../lib/constants'

// The volume offer, stated once, at the top of every page.
//
// This replaces an opening pop-up with a two-minute countdown. The countdown
// was the problem: a buyer comparing suppliers for a hundred uniforms reads a
// ticking clock as pressure, and pressure reads as a shop that needs the sale
// — the opposite of what the page is there to establish. The discount is real
// and permanent anyway; it applies automatically in the order wizard whether
// or not anyone saw a dialog. So it gets stated plainly and stays visible,
// instead of interrupting the page once and disappearing.
//
// Both figures are read from VOLUME_DISCOUNTS rather than written here, so the
// strip can never promise a discount the wizard would not apply.
const TIERS = VOLUME_DISCOUNTS.filter(d => parseInt(d.dis, 10) > 0)
const FIRST = TIERS[0]
const BEST = TIERS[TIERS.length - 1]
const qtyOf = t => (t.qty.match(/\d+/) || [''])[0]

export default function PromoBar() {
  return (
    <Link href="/devis" className="promo-strip">
      Dès <strong>{qtyOf(FIRST)} pièces</strong>
      <span className="promo-sep" aria-hidden="true" />
      jusqu'à <strong>−{BEST.dis}</strong> de remise
    </Link>
  )
}
