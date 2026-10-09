import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

// Opening question shared by /devis and /commande: catalogue garments, or
// the visitor's own (DTF + flocage service).
//
// Rendered through a portal: the page mounts it inside <main>, whose
// z-index:1 opens a stacking context that would trap it under the fixed
// tab bar (same reason as ProductSheet).
export default function AskTenues({ open, onNo, onYes, yesLabel }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted || !open) return null
  return createPortal(
    <div className="sheet-ov" onClick={onNo}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="ask-ttl" onClick={e => e.stopPropagation()}>
        <div className="sheet-grip" />
        <button className="sheet-x" aria-label="Fermer" onClick={onNo}>✕</button>
        <div className="sheet-body" style={{padding:'1rem 1.3rem 1.6rem'}}>
          <p className="s-lbl" style={{marginBottom:'.4rem'}}>Avant de commencer</p>
          <h2 id="ask-ttl" className="sheet-name" style={{marginBottom:'.5rem'}}>Avez-vous déjà vos tenues ?</h2>
          <p style={{fontSize:'.9rem',color:'var(--muted)',lineHeight:1.6,marginBottom:'1.2rem'}}>
            Une seule question, puis on vous guide étape par étape.
          </p>
          <div style={{display:'grid',gap:'.7rem'}}>
            <button type="button" className="btn-g" style={{justifyContent:'center'}} onClick={onNo}>
              Non, je choisis mes tenues chez vous
            </button>
            <button type="button" className="btn-outline" style={{justifyContent:'center'}} onClick={onYes}>
              {yesLabel}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
