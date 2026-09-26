import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { PRODUCTS , hasPriceGrid, priceRange } from '../lib/products'
import ProductImg from '../components/ProductImg'
import { VOLUME_DISCOUNTS } from '../lib/constants'
import Ico from '../components/Ico'

export default function Catalogue() {
  const [activeProduct, setActiveProduct] = useState(PRODUCTS[0])
  const [logoSrc, setLogoSrc] = useState(null)
  const [logoPos, setLogoPos] = useState({ x: 50, y: 40 })
  const [logoSize, setLogoSize] = useState(80)
  // Drag bookkeeping lives in refs, not state. A finger fires pointermove
  // dozens of times a second; re-rendering the whole configurator on each one
  // is wasted work, and state updates are batched — so a move landing in the
  // same tick as the press would read a stale `isDragging` and be dropped.
  const draggingRef = useRef(false)
  const dragStartRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)   // cursor feedback only
  const [dragOver, setDragOver] = useState(false)
  const canvasRef = useRef(null)

  // Logo drag inside canvas.
  //
  // Pointer events, not mouse events: the previous handlers listened only for
  // onMouseDown/Move/Up, which a phone never fires — so the logo could be
  // uploaded and resized but never moved, on the very devices most visitors
  // use. Pointer events cover mouse, finger and stylus with one code path.
  const pointToPercent = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    }
  }

  const handlePointerDown = (e) => {
    if (!logoSrc) return
    const { x, y } = pointToPercent(e)
    // Capture keeps the drag alive when the finger strays outside the canvas.
    // Guarded: setPointerCapture throws if the id is not a live pointer, and
    // an exception here would abort the handler before the drag even starts.
    try { e.currentTarget.setPointerCapture?.(e.pointerId) } catch { /* non bloquant */ }
    draggingRef.current = true
    dragStartRef.current = { x: x - logoPos.x, y: y - logoPos.y }
    setIsDragging(true)
  }

  const handlePointerMove = (e) => {
    if (!draggingRef.current || !dragStartRef.current) return
    // Without this the browser treats the gesture as a page scroll.
    e.preventDefault()
    const { x, y } = pointToPercent(e)
    const start = dragStartRef.current
    setLogoPos({
      x: Math.min(85, Math.max(5, x - start.x)),
      y: Math.min(85, Math.max(5, y - start.y)),
    })
  }

  const handlePointerUp = (e) => {
    try { e.currentTarget?.releasePointerCapture?.(e.pointerId) } catch { /* non bloquant */ }
    draggingRef.current = false
    dragStartRef.current = null
    setIsDragging(false)
  }

  const handleFileInput = (files) => {
    const f = files[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = (e) => setLogoSrc(e.target.result)
    reader.readAsDataURL(f)
  }

  const downloadPreview = () => {
    const canvas = document.createElement('canvas')
    canvas.width = 600; canvas.height = 600
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#FBF8F3'; ctx.fillRect(0,0,600,600)
    ctx.font = '200px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(activeProduct.emoji, 300, 300)
    if (logoSrc) {
      const img = new window.Image()
      img.onload = () => {
        ctx.drawImage(img, (logoPos.x/100)*600 - logoSize/2, (logoPos.y/100)*600 - logoSize/2, logoSize, logoSize)
        const a = document.createElement('a'); a.download = 'djimmy-apercu.png'; a.href = canvas.toDataURL(); a.click()
      }
      img.src = logoSrc
    } else {
      const a = document.createElement('a'); a.download = 'djimmy-apercu.png'; a.href = canvas.toDataURL(); a.click()
    }
  }

  return (
    <>
      <Head>
        <title>Catalogue & Configurateur — Djimmy Prints</title>
        <meta name="description" content="Configurez votre logo sur nos uniformes. Broderie, sérigraphie, transfert numérique. Prix affichés, livraison 58 wilayas." />
      </Head>

      {/* PAGE HEADER */}
      <div className="rv" style={{padding:'1.6rem 1.15rem 1.2rem',position:'relative',zIndex:1}}>
        <p className="s-lbl">Configurateur visuel</p>
        <h1 className="s-ttl">Placez votre <span className="kw">logo</span> vous-même</h1>
        <p className="s-desc">Choisissez un produit, uploadez votre logo, glissez-le où vous voulez. Téléchargez l'aperçu ou commandez directement.</p>
      </div>

      {/* CATALOGUE LAYOUT */}
      <div style={{padding:'0 1.15rem 2.5rem',position:'relative',zIndex:1}}>
        <div className="grid-2 rv">

          {/* ── CONFIGURATEUR ── */}
          <div style={{background:'var(--white)',border:'1.5px solid var(--cream-border)',borderRadius:'var(--r)',overflow:'hidden'}}>
            {/* Header */}
            <div style={{padding:'1.2rem 1.5rem',borderBottom:'1px solid var(--cream-border)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div style={{fontFamily:'var(--display)',fontWeight:700,fontSize:'1.1rem',letterSpacing:'-.01em'}}>Studio logo</div>
            </div>

            {/* Product selector */}
            <div style={{padding:'1rem 1.5rem',display:'flex',gap:'.5rem',flexWrap:'wrap',borderBottom:'1px solid var(--cream-border)'}}>
              {PRODUCTS.map(p => (
                <button key={p.name} onClick={() => setActiveProduct(p)} style={{
                  padding:'.3rem .7rem',fontSize:'.75rem',border:'1.5px solid',borderRadius:'var(--r-s)',cursor:'pointer',fontFamily:'inherit',fontWeight:500,
                  borderColor: activeProduct.name===p.name ? 'var(--green)' : 'var(--cream-border)',
                  background: activeProduct.name===p.name ? 'var(--green)' : 'var(--cream)',
                  color: activeProduct.name===p.name ? '#fff' : 'var(--black)',
                  transition:'all .2s',
                }}>
                  {p.name}
                </button>
              ))}
            </div>

            {/* Canvas */}
            <div
              ref={canvasRef}
              style={{
                position:'relative', aspectRatio:'1',
                background: 'var(--surface-2)',
                display:'flex', alignItems:'center', justifyContent:'center',
                cursor: logoSrc ? (isDragging ? 'grabbing' : 'grab') : 'default',
                userSelect:'none',
                touchAction: 'none',
              }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              <ProductImg product={activeProduct} size="100%" radius={0}
                style={{position:'absolute',inset:0,background:'transparent',pointerEvents:'none'}} />
              {logoSrc && (
                <img src={logoSrc} alt="Logo" style={{
                  position:'absolute',
                  left:`${logoPos.x}%`, top:`${logoPos.y}%`,
                  width: logoSize, height: logoSize,
                  objectFit:'contain',
                  transform:'translate(-50%,-50%)',
                  pointerEvents:'none',
                  border: '2px dashed rgba(111,175,82,.6)',
                  borderRadius: '4px',
                  padding: '4px',
                }} />
              )}
              {!logoSrc && (
                <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',pointerEvents:'none'}}>
                  <div style={{textAlign:'center',color:'var(--muted)',fontSize:'.8rem'}}>
                    <div style={{marginBottom:'.45rem',display:'flex',justifyContent:'center',color:'var(--muted-light)'}}><Ico n="upload" size={26} /></div>
                    Uploadez votre logo pour le placer ici
                  </div>
                </div>
              )}
            </div>

            {/* Slider taille */}
            {logoSrc && (
              <div style={{padding:'.8rem 1.5rem',borderTop:'1px solid var(--cream-border)',display:'flex',alignItems:'center',gap:'1rem'}}>
                <span style={{fontSize:'.75rem',color:'var(--muted)',whiteSpace:'nowrap'}}>Taille logo</span>
                <input type="range" min="30" max="200" value={logoSize}
                  onChange={e=>setLogoSize(+e.target.value)}
                  style={{flex:1,accentColor:'var(--green)'}} />
                <span style={{fontSize:'.75rem',color:'var(--green)',fontWeight:600,whiteSpace:'nowrap'}}>{logoSize}px</span>
              </div>
            )}

            {/* Upload zone */}
            <div
              style={{
                margin:'1rem 1.5rem',
                border:`2px dashed ${dragOver ? 'var(--green)' : 'var(--cream-border)'}`,
                borderRadius:'var(--r)',
                padding:'1.5rem',
                textAlign:'center',
                cursor:'pointer',
                background: dragOver ? 'var(--green-pale)' : 'var(--cream)',
                transition:'all .2s',
              }}
              onClick={()=>document.getElementById('logoInput').click()}
              onDragOver={e=>{e.preventDefault();setDragOver(true)}}
              onDragLeave={()=>setDragOver(false)}
              onDrop={e=>{e.preventDefault();setDragOver(false);handleFileInput(e.dataTransfer.files)}}
            >
              <div style={{marginBottom:'.45rem',display:'flex',justifyContent:'center',color:'var(--green)'}}><Ico n="upload" size={26} /></div>
              <div style={{fontWeight:600,fontSize:'.85rem',marginBottom:'.2rem'}}>Uploadez votre logo</div>
              <div style={{fontSize:'.72rem',color:'var(--muted)'}}>PNG, JPG, SVG — glissez-déposez ou cliquez</div>
              <input id="logoInput" type="file" accept=".jpg,.jpeg,.png,.svg" style={{display:'none'}} onChange={e=>handleFileInput(e.target.files)} />
            </div>

            {/* Actions */}
            <div style={{padding:'0 1.5rem 1.5rem',display:'flex',gap:'.7rem'}}>
              <button onClick={downloadPreview} style={{
                flex:1,padding:'.8rem',fontSize:'.88rem',fontWeight:600,border:'1.5px solid var(--green)',
                color:'var(--green)',background:'transparent',borderRadius:'var(--r-s)',cursor:'pointer',fontFamily:'inherit',
                display:'inline-flex',alignItems:'center',justifyContent:'center',gap:'.45rem',
              }}>
                <Ico n="download" size={16} /> Télécharger aperçu
              </button>
              {logoSrc && (
                <button onClick={()=>{setLogoSrc(null);setLogoPos({x:50,y:40});setLogoSize(80)}} style={{
                  padding:'.7rem 1rem',fontSize:'.78rem',fontWeight:600,border:'1.5px solid var(--cream-border)',
                  color:'var(--muted)',background:'transparent',borderRadius:'var(--r-s)',cursor:'pointer',fontFamily:'inherit',
                }}>
                  ↺ Reset
                </button>
              )}
            </div>
          </div>

          {/* ── PRODUITS + PRIX ── */}
          <div>
            <h2 className="s-ttl" style={{marginBottom:'2rem'}}>Nos <span className="kw">produits & prix</span></h2>

            <div style={{display:'flex',flexDirection:'column',gap:'1rem',marginBottom:'3rem'}}>
              {PRODUCTS.map(p => (
                <div key={p.name} onClick={()=>setActiveProduct(p)} style={{
                  background: activeProduct.name===p.name ? 'var(--green-pale)' : 'var(--white)',
                  border: `1.5px solid ${activeProduct.name===p.name ? 'var(--green)' : 'var(--cream-border)'}`,
                  borderRadius:'var(--r)', padding:'1.2rem',
                  display:'flex', alignItems:'center', justifyContent:'space-between', gap:'.8rem',
                  cursor:'pointer', transition:'all .2s', position:'relative',
                }}>
                  {p.popular && (
                    <span style={{
                      position:'absolute',top:'-10px',right:'12px',
                      background:'var(--gold-d)',color:'#fff',
                      fontSize:'.68rem',fontWeight:700,padding:'.22rem .6rem',borderRadius:'3px',
                      letterSpacing:'.08em',textTransform:'uppercase',
                    }}>Populaire</span>
                  )}
                  <div style={{display:'flex',alignItems:'center',gap:'1rem',minWidth:0,flex:1}}>
                    <ProductImg product={p} size={104} radius={8} />
                    <div style={{minWidth:0}}>
                      <div style={{fontFamily:'var(--display)',fontWeight:700,fontSize:'1.05rem',letterSpacing:'-.01em',marginBottom:'.25rem'}}>{p.name}</div>
                      <div style={{fontSize:'.85rem',color:'var(--muted)',lineHeight:1.5}}>{p.desc}</div>
                      <div style={{display:'flex',gap:'.4rem',marginTop:'.4rem',flexWrap:'wrap'}}>
                        {p.techniques.map(t => (
                          <span key={t} style={{fontSize:'.72rem',background:'var(--green-pale)',color:'var(--green)',padding:'.18rem .55rem',borderRadius:'3px',fontWeight:600}}>{t}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  {/* "dès" goes on its own line rather than in front of the
                      figure: prefixed, the price column grew wide enough to
                      push the row past the screen on a 320px handset. */}
                  <div style={{textAlign:'right',flexShrink:0}}>
                    {hasPriceGrid(p) && (
                      <div style={{fontSize:'.72rem',color:'var(--muted)',lineHeight:1.2}}>à partir de</div>
                    )}
                    <div style={{fontFamily:'var(--display)',fontWeight:700,fontSize:'1.45rem',letterSpacing:'-.02em',color:'var(--green)',lineHeight:1.05,whiteSpace:'nowrap'}}>
                      {(hasPriceGrid(p) ? priceRange(p)[0] : p.price).toLocaleString('fr-DZ')}
                    </div>
                    <div style={{fontSize:'.76rem',color:'var(--muted)'}}>DA / pièce</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Remises volume */}
            <div style={{background:'var(--cream)',border:'1.5px solid var(--cream-border)',borderRadius:'var(--r)',overflow:'hidden',marginBottom:'2rem'}}>
              <div style={{padding:'1rem 1.5rem',borderBottom:'1px solid var(--cream-border)',fontFamily:'var(--display)',fontWeight:700,fontSize:'1.05rem',letterSpacing:'-.01em'}}>
                Remises volume
              </div>
              <div className="vol-grid">
                {VOLUME_DISCOUNTS.map((d,i) => (
                  <div key={d.qty} style={{
                    padding:'1rem',textAlign:'center',
                    borderRight: i<3 ? '1px solid var(--cream-border)' : 'none',
                  }}>
                    <div style={{fontFamily:'var(--display)',fontSize:'1.3rem',color:i>0?'var(--green)':'var(--muted)'}}>{d.dis}</div>
                    <div style={{fontSize:'.7rem',fontWeight:700,color:'var(--black)',margin:'.2rem 0'}}>{d.qty} pièces</div>
                    <div style={{fontSize:'.65rem',color:'var(--muted)'}}>{d.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <Link href="/commande" className="btn-g" style={{width:'100%',justifyContent:'center'}}>
              Commander ce produit
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
