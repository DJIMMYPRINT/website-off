import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/router'
import { VOLUME_DISCOUNTS } from '../lib/constants'

// Opening offer shown once at the start of a visit.
//
// The threshold is read from VOLUME_DISCOUNTS rather than written here, so
// the popup can never promise a discount the order wizard would not actually
// apply — the two would drift apart the first time the tiers are retuned.
const TIER = VOLUME_DISCOUNTS.find(d => d.dis === '10%') || VOLUME_DISCOUNTS[VOLUME_DISCOUNTS.length - 1]
const MIN_QTY = (TIER.qty.match(/\d+/) || ['100'])[0]

const SECONDS = 120
const SEEN_KEY = 'djimmy_promo_seen_v1'

// Never interrupt someone who is already converting. A visitor who lands on
// the order wizard or the quote form came to fill it in — covering it with a
// discount popup costs orders, and the volume discount applies automatically
// anyway.
const SKIP_ON = ['/commande', '/devis']

export default function PromoModal() {
  const [open, setOpen] = useState(false)
  const [left, setLeft] = useState(SECONDS)
  const closeRef = useRef(null)
  const router = useRouter()

  // Once per visit, not once per page: sessionStorage clears when the tab
  // closes, so a returning visitor sees it again tomorrow but is not nagged
  // on every navigation. Wrapped because storage throws outright in some
  // privacy modes rather than returning null.
  useEffect(() => {
    if (SKIP_ON.includes(router.pathname)) return
    let seen = false
    try { seen = window.sessionStorage.getItem(SEEN_KEY) === '1' } catch { seen = false }
    if (seen) return
    const t = setTimeout(() => setOpen(true), 1500)   // let the page paint first
    return () => clearTimeout(t)
  }, [router.pathname])

  const dismiss = () => {
    setOpen(false)
    try { window.sessionStorage.setItem(SEEN_KEY, '1') } catch { /* private mode */ }
  }

  // Countdown. Closes itself at zero rather than sitting there at 00:00
  // claiming an offer that has visibly run out.
  useEffect(() => {
    if (!open) return
    const id = setInterval(() => {
      setLeft(s => {
        if (s <= 1) { clearInterval(id); dismiss(); return 0 }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [open])

  // Escape closes, and focus lands on the close button so the dialog is
  // operable from a keyboard.
  useEffect(() => {
    if (!open) return
    const onKey = e => { if (e.key === 'Escape') dismiss() }
    document.addEventListener('keydown', onKey)
    closeRef.current?.focus()
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open) return null

  const mm = String(Math.floor(left / 60)).padStart(2, '0')
  const ss = String(left % 60).padStart(2, '0')

  const go = () => { dismiss(); router.push('/devis') }

  return (
    <div className="promo-ov" onClick={dismiss}>
      <div
        className="promo-box"
        role="dialog"
        aria-modal="true"
        aria-labelledby="promo-t"
        onClick={e => e.stopPropagation()}
      >
        <button ref={closeRef} className="promo-x" onClick={dismiss} aria-label="Fermer">✕</button>

        <span className="promo-badge">Offre limitée</span>

        <h2 id="promo-t" className="promo-title">Pack&nbsp;Entreprises</h2>
        <div className="promo-off">−10<span>%</span></div>

        <p className="promo-txt">
          Sur vos uniformes personnalisés à partir de <strong>{MIN_QTY} pièces</strong>.
          Broderie, sérigraphie ou transfert — livraison dans les 58 wilayas.
        </p>

        <div className="promo-timer" aria-live="off">
          <span className="promo-timer-lbl">Offre valable encore</span>
          <span className="promo-clock u-mono">{mm}:{ss}</span>
        </div>

        <button className="btn-g promo-cta" onClick={go}>J'en profite</button>
        <button className="promo-later" onClick={dismiss}>Plus tard</button>
      </div>
    </div>
  )
}
