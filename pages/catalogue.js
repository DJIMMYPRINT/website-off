import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { PRODUCTS } from '../lib/products'
import { VOLUME_DISCOUNTS } from '../lib/constants'

export default function Catalogue() {
  const [activeProduct, setActiveProduct] = useState(PRODUCTS[0])
  const [vizMode, setVizMode] = useState('visitor') // visitor | client
  const [logoSrc, setLogoSrc] = useState(null)
  const [logoPos, setLogoPos] = useState({ x: 50, y: 40 })
  const [logoSize, setLogoSize] = useState(80)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const canvasRef = useRef(null)

  // Logo drag inside canvas
  const handleCanvasMouseDown = (e) => {
    if (!logoSrc) return
    const rect = canvasRef.current.getBoundingClientRect()
    const cx = ((e.clientX - rect.left) / rect.width) * 100
    const cy = ((e.clientY - rect.top) / rect.height) * 100
    setIsDragging(true)
    setDragStart({ x: cx - logoPos.x, y: cy - logoPos.y })
  }
  const handleCanvasMouseMove = (e) => {
    if (!isDragging || !dragStart) return
    const rect = canvasRef.current.getBoundingClientRect()
    const cx = ((e.clientX - rect.left) / rect.width) * 100
    const cy = ((e.clientY - rect.top) / rect.height) * 100
    setLogoPos({ x: Math.min(85, Math.max(5, cx - dragStart.x)), y: Math.min(85, Math.max(5, cy - dragStart.y)) })
  }
  const handleCanvasMouseUp = () => { setIsDragging(false); setDragStart(null) }

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
    ctx.fillStyle = '#F5F0E8'; ctx.fillRect(0,0,600,600)
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
      <div style={{padding:'9rem 4vw 3rem',position:'relative',zIndex:1}}>
        <p className="s-lbl">Configurateur visuel</p>
        <h1 className="s-ttl">Placez votre <span className="kw">logo</span> vous-même</h1>
        <p className="s-desc">Choisissez un produit, uploadez votre logo, glissez-le où vous voulez. Téléchargez l'aperçu ou commandez directement.</p>
      </div>

      {/* CATALOGUE LAYOUT */}
      <div style={{padding:'0 4vw 5rem',position:'relative',zIndex:1}}>
        <div className="grid-2">

          {/* ── CONFIGURATEUR ── */}
          <div style={{background:'var(--white)',border:'1.5px solid var(--cream-border)',borderRadius:'8px',overflow:'hidden'}}>
            {/* Header */}
            <div style={{padding:'1.2rem 1.5rem',borderBottom:'1px solid var(--cream-border)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div style={{fontFamily:'Anton',fontSize:'1rem',letterSpacing:'.04em',textTransform:'uppercase'}}>🎨 Studio logo</div>
              <div style={{display:'flex',background:'var(--cream)',borderRadius:'3px',overflow:'hidden',border:'1px solid var(--cream-border)'}}>
                {['visitor','client'].map(m => (
                  <button key={m} onClick={()=>setVizMode(m)} style={{
                    padding:'.35rem .8rem',fontSize:'.72rem',fontWeight:600,border:'none',cursor:'pointer',fontFamily:'Inter',
                    background: vizMode===m ? 'var(--green)' : 'transparent',
                    color: vizMode===m ? 'var(--white)' : 'var(--muted)',
                    textTransform:'capitalize',transition:'all .2s',
                  }}>
                    {m === 'visitor' ? 'Visiteur' : 'Client'}
                  </button>
                ))}
              </div>
            </div>

            {/* Product selector */}
            <div style={{padding:'1rem 1.5rem',display:'flex',gap:'.5rem',flexWrap:'wrap',borderBottom:'1px solid var(--cream-border)'}}>
              {PRODUCTS.map(p => (
                <button key={p.name} onClick={() => setActiveProduct(p)} style={{
                  padding:'.3rem .7rem',fontSize:'.75rem',border:'1.5px solid',borderRadius:'3px',cursor:'pointer',fontFamily:'Inter',fontWeight:500,
                  borderColor: activeProduct.name===p.name ? 'var(--green)' : 'var(--cream-border)',
                  background: activeProduct.name===p.name ? 'var(--green)' : 'var(--cream)',
                  color: activeProduct.name===p.name ? 'var(--white)' : 'var(--black)',
                  transition:'all .2s',
                }}>
                  {p.emoji} {p.name}
                </button>
              ))}
            </div>

            {/* Canvas */}
            <div
              ref={canvasRef}
              style={{
                position:'relative', aspectRatio:'1',
                background: 'linear-gradient(135deg, #f0ede6 0%, #e8e2d9 100%)',
                display:'flex', alignItems:'center', justifyContent:'center',
                cursor: logoSrc ? 'grab' : 'default',
                userSelect:'none',
              }}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
            >
              <span style={{fontSize:'12rem',userSelect:'none',pointerEvents:'none'}}>{activeProduct.emoji}</span>
              {logoSrc && (
                <img src={logoSrc} alt="Logo" style={{
                  position:'absolute',
                  left:`${logoPos.x}%`, top:`${logoPos.y}%`,
                  width: logoSize, height: logoSize,
                  objectFit:'contain',
                  transform:'translate(-50%,-50%)',
                  pointerEvents:'none',
                  border: vizMode==='client' ? 'none' : '2px dashed rgba(45,90,39,.4)',
                  borderRadius: '4px',
                  padding: '4px',
                }} />
              )}
              {!logoSrc && (
                <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',pointerEvents:'none'}}>
                  <div style={{textAlign:'center',color:'var(--muted)',fontSize:'.8rem'}}>
                    <div style={{fontSize:'1.5rem',marginBottom:'.3rem'}}>⬆️</div>
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
                borderRadius:'6px',
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
              <div style={{fontSize:'1.5rem',marginBottom:'.3rem'}}>⬆️</div>
              <div style={{fontWeight:600,fontSize:'.85rem',marginBottom:'.2rem'}}>Uploadez votre logo</div>
              <div style={{fontSize:'.72rem',color:'var(--muted)'}}>PNG, JPG, SVG — glissez-déposez ou cliquez</div>
              <input id="logoInput" type="file" accept=".jpg,.jpeg,.png,.svg" style={{display:'none'}} onChange={e=>handleFileInput(e.target.files)} />
            </div>

            {/* Actions */}
            <div style={{padding:'0 1.5rem 1.5rem',display:'flex',gap:'.7rem'}}>
              <button onClick={downloadPreview} style={{
                flex:1,padding:'.7rem',fontSize:'.78rem',fontWeight:600,border:'1.5px solid var(--green)',
                color:'var(--green)',background:'transparent',borderRadius:'3px',cursor:'pointer',fontFamily:'Inter',
              }}>
                ⬇ Télécharger aperçu
              </button>
              {logoSrc && (
                <button onClick={()=>{setLogoSrc(null);setLogoPos({x:50,y:40});setLogoSize(80)}} style={{
                  padding:'.7rem 1rem',fontSize:'.78rem',fontWeight:600,border:'1.5px solid var(--cream-border)',
                  color:'var(--muted)',background:'transparent',borderRadius:'3px',cursor:'pointer',fontFamily:'Inter',
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
                  borderRadius:'6px', padding:'1.2rem 1.5rem',
                  display:'flex', alignItems:'center', justifyContent:'space-between',
                  cursor:'pointer', transition:'all .2s', position:'relative',
                }}>
                  {p.popular && (
                    <span style={{
                      position:'absolute',top:'-10px',right:'12px',
                      background:'var(--gold)',color:'var(--white)',
                      fontSize:'.62rem',fontWeight:700,padding:'.2rem .6rem',borderRadius:'100px',
                      letterSpacing:'.08em',textTransform:'uppercase',
                    }}>Populaire</span>
                  )}
                  <div style={{display:'flex',alignItems:'center',gap:'1rem'}}>
                    <span style={{fontSize:'1.8rem'}}>{p.emoji}</span>
                    <div>
                      <div style={{fontFamily:'Anton',fontSize:'.95rem',textTransform:'uppercase',letterSpacing:'.02em',marginBottom:'.2rem'}}>{p.name}</div>
                      <div style={{fontSize:'.75rem',color:'var(--muted)'}}>{p.desc}</div>
                      <div style={{display:'flex',gap:'.4rem',marginTop:'.4rem',flexWrap:'wrap'}}>
                        {p.techniques.map(t => (
                          <span key={t} style={{fontSize:'.65rem',background:'var(--green-pale)',color:'var(--green)',padding:'.15rem .5rem',borderRadius:'100px',fontWeight:600}}>{t}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div style={{textAlign:'right',flexShrink:0}}>
                    <div style={{fontFamily:'Anton',fontSize:'1.4rem',color:'var(--green)',lineHeight:1}}>{p.price.toLocaleString('fr-DZ')}</div>
                    <div style={{fontSize:'.7rem',color:'var(--muted)'}}>DA / pièce</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Remises volume */}
            <div style={{background:'var(--cream)',border:'1.5px solid var(--cream-border)',borderRadius:'8px',overflow:'hidden',marginBottom:'2rem'}}>
              <div style={{padding:'1rem 1.5rem',borderBottom:'1px solid var(--cream-border)',fontFamily:'Anton',fontSize:'.9rem',textTransform:'uppercase',letterSpacing:'.04em'}}>
                📦 Remises volume
              </div>
              <div className="vol-grid">
                {VOLUME_DISCOUNTS.map((d,i) => (
                  <div key={d.qty} style={{
                    padding:'1rem',textAlign:'center',
                    borderRight: i<3 ? '1px solid var(--cream-border)' : 'none',
                  }}>
                    <div style={{fontFamily:'Anton',fontSize:'1.3rem',color:i>0?'var(--green)':'var(--muted)'}}>{d.dis}</div>
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
