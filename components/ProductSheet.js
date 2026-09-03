import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import ProductImg from './ProductImg'
import { COLORS, SIZES, MIN_ORDER } from '../lib/constants'

// Product sheet that slides up from the bottom of the screen.
//
// Replaces the previous flow, where picking a product, then a colour, then
// quantities, then "add to cart" were four stacked blocks a visitor had to
// scroll through in order. Everything about one product now lives in one
// place, opened by tapping it and closed as soon as it is in the cart.
//
// Sizes get a minus/plus stepper AND a typable field on purpose: tapping is
// pleasant for small runs, but this is a bulk business — nobody wants to tap
// "+" sixty times.
export default function ProductSheet({ product, onAdd, onClose }) {
  const [color, setColor] = useState(COLORS[0])
  const [sizes, setSizes] = useState({})
  const [mounted, setMounted] = useState(false)

  // Rendered through a portal on purpose. The page mounts this inside
  // <main>, which carries z-index:1 and therefore opens a stacking context —
  // the sheet's own z-index is trapped inside it, and the fixed tab bar
  // (a sibling of <main>) paints over the footer, leaving "Ajouter au
  // panier" unclickable. Escaping to <body> puts the sheet back on top.
  useEffect(() => { setMounted(true) }, [])

  // Reset whenever a different product is opened, otherwise the previous
  // product's quantities carry over into the next one.
  useEffect(() => { setColor(COLORS[0]); setSizes({}) }, [product?.name])

  useEffect(() => {
    if (!product) return
    const onKey = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [product, onClose])

  const total = useMemo(
    () => Object.values(sizes).reduce((a, b) => a + (+b || 0), 0),
    [sizes]
  )

  if (!product) return null

  const bump = (s, d) => setSizes(v => ({ ...v, [s]: Math.max(0, (+v[s] || 0) + d) }))
  const set = (s, val) => setSizes(v => ({ ...v, [s]: Math.max(0, Math.min(9999, +val || 0)) }))

  const add = () => {
    if (total === 0) return
    onAdd({ ...product, qty: total, color, sizes: { ...sizes } })
    onClose()
  }

  if (!mounted) return null

  return createPortal(
    <div className="sheet-ov" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={product.name}
           onClick={e => e.stopPropagation()}>
        <div className="sheet-grip" />
        <button className="sheet-x" onClick={onClose} aria-label="Fermer">✕</button>

        <div className="sheet-body">
          <div className="sheet-head">
            <ProductImg product={product} size={112} radius={16} />
            <div style={{minWidth:0}}>
              <h3 className="sheet-name">{product.name}</h3>
              <div className="sheet-price">{product.price.toLocaleString('fr-DZ')} <span>DA / pièce</span></div>
              <div className="sheet-tags">
                {product.techniques.map(t => <span key={t} className="sheet-tag">{t}</span>)}
              </div>
            </div>
          </div>

          <p className="sheet-desc">{product.desc}</p>

          <ul className="sheet-specs">
            <li><span>Marquage</span><strong>{product.techniques.join(' · ')}</strong></li>
            <li><span>Tailles</span><strong>{SIZES[0]} → {SIZES[SIZES.length - 1]}</strong></li>
            <li><span>Minimum</span><strong>{MIN_ORDER} pièces</strong></li>
            <li><span>Livraison</span><strong>58 wilayas</strong></li>
          </ul>

          <div className="sheet-lbl">Couleur</div>
          <div className="sheet-colors">
            {COLORS.map(c => (
              <button key={c} onClick={() => setColor(c)}
                      className={`sheet-chip${color === c ? ' on' : ''}`}>{c}</button>
            ))}
          </div>

          <div className="sheet-lbl">Quantité par taille</div>
          <div className="sheet-sizes">
            {SIZES.map(s => {
              const q = +sizes[s] || 0
              return (
                <div key={s} className={`sheet-row${q > 0 ? ' on' : ''}`}>
                  <span className="sheet-size">{s}</span>
                  <button onClick={() => bump(s, -1)} disabled={q === 0} aria-label={`Retirer un ${s}`}>−</button>
                  <input type="number" inputMode="numeric" min="0" max="9999"
                         value={q === 0 ? '' : q} placeholder="0"
                         onChange={e => set(s, e.target.value)} aria-label={`Quantité taille ${s}`} />
                  <button onClick={() => bump(s, 1)} aria-label={`Ajouter un ${s}`}>+</button>
                </div>
              )
            })}
          </div>
        </div>

        <div className="sheet-foot">
          <div className="sheet-sum">
            <span>{total} pièce{total > 1 ? 's' : ''}</span>
            <strong>{(product.price * total).toLocaleString('fr-DZ')} DA</strong>
          </div>
          <button className="btn-g sheet-add" onClick={add} disabled={total === 0}>
            {total === 0 ? 'Choisissez une quantité' : 'Ajouter au panier'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
