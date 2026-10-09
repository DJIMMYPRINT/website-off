import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Ico from './Ico'

// Centred pop-up announcing the next step of the order wizard. It opens a
// moment after the step changes (so the page has finished scrolling) and
// each step's pop-up shows once; `warn` marks a reminder ("D'abord…").
//
// tip: { id, label, t, d, warn?, actions: [{ label, onClick, primary? }] }
export default function GuidePop({ tip, onClose }) {
  const [mounted, setMounted] = useState(false)
  const [shown, setShown] = useState(null)
  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    setShown(null)
    if (!tip) return
    const t = setTimeout(() => setShown(tip.key || tip.id), tip.warn ? 0 : 450)
    return () => clearTimeout(t)
  }, [tip?.key || tip?.id])
  useEffect(() => {
    if (!shown) return
    const onKey = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [shown, onClose])

  if (!mounted || !tip || shown !== (tip.key || tip.id)) return null
  return createPortal(
    <div className="gp-ov" onClick={onClose}>
      <div className={`gp${tip.warn ? ' gp-warn' : ''}`} role="dialog" aria-modal="true" aria-labelledby="gp-ttl" onClick={e => e.stopPropagation()}>
        <button className="gp-x" aria-label="Fermer" onClick={onClose}>✕</button>
        <div className="gp-ic">
          {tip.warn ? <Ico n="warn" size={22} /> : <Ico n="info" size={22} />}
        </div>
        {tip.label && <div className="gp-lbl">{tip.label}</div>}
        <h2 id="gp-ttl" className="gp-ttl">{tip.t}</h2>
        <p className="gp-d">{tip.d}</p>
        <div className="gp-acts">
          {tip.actions.map(a => (
            <button key={a.label} type="button" className={a.primary ? 'btn-g' : 'btn-outline'}
              style={{justifyContent:'center'}} onClick={a.onClick}>{a.label}</button>
          ))}
        </div>
      </div>
    </div>,
    document.body
  )
}
