import Head from 'next/head'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { WA, PHONE_DISPLAY, ORDER_STAGES } from '../lib/constants'
import { findOrder, listOrders, normalizeRef } from '../lib/orders'

const inputStyle = {
  width:'100%', padding:'.85rem 1rem', border:'1.5px solid var(--cream-border)',
  borderRadius:'4px', fontSize:'1rem', fontFamily:'inherit', letterSpacing:'.08em',
  background:'var(--white)', color:'var(--black)', outline:'none', textTransform:'uppercase',
}

export default function Suivi() {
  const router = useRouter()
  const [ref, setRef] = useState('')
  const [result, setResult] = useState(null)   // order object
  const [searched, setSearched] = useState(false)
  const [recent, setRecent] = useState([])

  // localStorage is read after mount only: reading it during render would make
  // the server-rendered HTML and the first client render disagree.
  useEffect(() => { setRecent(listOrders()) }, [])

  // Support deep links from the confirmation screen: /suivi?ref=DP-XXXXXX
  useEffect(() => {
    if (!router.isReady) return
    const q = router.query.ref
    if (typeof q === 'string' && q) {
      setRef(normalizeRef(q))
      setResult(findOrder(q))
      setSearched(true)
    }
  }, [router.isReady, router.query.ref])

  const search = (value) => {
    const target = value ?? ref
    setRef(normalizeRef(target))
    setResult(findOrder(target))
    setSearched(true)
  }

  const stageIndex = result
    ? Math.max(0, ORDER_STAGES.findIndex(s => s.key === (result.stage || 'recue')))
    : 0

  const waFollowUp = result
    ? `https://wa.me/${WA}?text=${encodeURIComponent(`Bonjour Djimmy Prints, où en est ma commande ${result.ref} ?`)}`
    : `https://wa.me/${WA}?text=${encodeURIComponent('Bonjour Djimmy Prints, je souhaite suivre ma commande.')}`

  return (
    <>
      <Head>
        <title>Suivre ma commande — Djimmy Prints</title>
        <meta name="description" content="Suivez l'avancement de votre commande d'uniformes personnalisés Djimmy Prints avec votre référence DP-XXXXXX." />
      </Head>

      <div style={{padding:'1.6rem 1.15rem 2.5rem',position:'relative',zIndex:1}}>
        <p className="s-lbl">Suivi de commande</p>
        <h1 className="s-ttl">Où en est <span className="kw">ma commande ?</span></h1>
        <p className="s-desc">
          Entrez la référence reçue à la validation de votre commande
          (format <strong>DP-XXXXXX</strong>) pour en retrouver le détail et l'étape en cours.
        </p>

        {/* ── SEARCH ── */}
        <div style={{maxWidth:560,marginTop:'2.5rem'}}>
          <form onSubmit={e => { e.preventDefault(); search() }} style={{display:'flex',gap:'.7rem',flexWrap:'wrap'}}>
            <input
              style={{...inputStyle, flex:'1 1 240px'}}
              placeholder="DP-XXXXXX"
              aria-label="Référence de commande"
              value={ref}
              onChange={e => setRef(e.target.value)}
            />
            <button type="submit" className="btn-g">Suivre</button>
          </form>

          {recent.length > 0 && (
            <div style={{marginTop:'1rem'}}>
              <span style={{fontSize:'.75rem',color:'var(--muted)',marginRight:'.6rem'}}>Sur cet appareil :</span>
              {recent.slice(0, 5).map(o => (
                <button key={o.ref} onClick={() => search(o.ref)} className="u-mono" style={{
                  fontSize:'.75rem', fontWeight:700, padding:'.28rem .7rem', marginRight:'.4rem', marginTop:'.35rem',
                  border:'1.5px solid var(--cream-border)', background:'var(--white)', color:'var(--green)',
                  borderRadius:'100px', cursor:'pointer', fontFamily:'inherit',
                }}>
                  {o.ref}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── RESULT ── */}
        {searched && result && (
          <div className="grid-side" style={{marginTop:'3.5rem'}}>
            {/* Timeline */}
            <div style={{background:'var(--white)',border:'1.5px solid var(--cream-border)',borderRadius:'20px',padding:'2rem'}}>
              <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',flexWrap:'wrap',gap:'.6rem',marginBottom:'2rem'}}>
                <div>
                  <div style={{fontFamily:'var(--display)',fontSize:'1.5rem',letterSpacing:'.03em'}} className="u-mono">
                    {result.ref}
                  </div>
                  <div style={{fontSize:'.8rem',color:'var(--muted)',marginTop:'.2rem'}}>
                    Commande passée le {result.date}
                  </div>
                </div>
                <span style={{
                  background:'var(--green-pale)', color:'var(--green)', fontWeight:700,
                  fontSize:'.72rem', letterSpacing:'.08em', textTransform:'uppercase',
                  padding:'.35rem .9rem', borderRadius:'100px', border:'1px solid rgba(139,92,246,.3)',
                }}>
                  {ORDER_STAGES[stageIndex].label}
                </span>
              </div>

              <ul className="tl">
                {ORDER_STAGES.map((s, i) => (
                  <li key={s.key} className={`tl-item ${i < stageIndex ? 'done' : i === stageIndex ? 'current' : ''}`}>
                    <div className="tl-rail">
                      <div className="tl-dot">{i < stageIndex ? '✓' : s.ic}</div>
                      {i < ORDER_STAGES.length - 1 && <div className="tl-line" />}
                    </div>
                    <div className="tl-body">
                      <div style={{fontWeight:700,fontSize:'.92rem',color: i <= stageIndex ? 'var(--black)' : 'var(--muted-light)'}}>
                        {s.label}
                      </div>
                      <p style={{fontSize:'.82rem',color:'var(--muted)',lineHeight:1.7,marginTop:'.15rem'}}>{s.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>

              <div style={{marginTop:'1.5rem',padding:'1rem 1.2rem',background:'var(--cream)',borderRadius:'16px',fontSize:'.82rem',color:'var(--muted)',lineHeight:1.7}}>
                ℹ️ L'étape affichée correspond au dernier état enregistré sur cet appareil.
                Pour le point exact en atelier, un message WhatsApp reste le plus rapide.
              </div>
            </div>

            {/* Order detail */}
            <div className="sticky-side">
              <div style={{background:'var(--white)',border:'1.5px solid var(--cream-border)',borderRadius:'20px',overflow:'hidden',marginBottom:'1.2rem'}}>
                <div style={{padding:'1.2rem 1.5rem',borderBottom:'1px solid var(--cream-border)',fontFamily:'var(--display)',fontSize:'1rem',letterSpacing:'.04em'}}>
                  📦 Détail
                </div>
                <div style={{padding:'1.5rem'}}>
                  {(result.items || []).map((it, i) => (
                    <div key={i} style={{display:'flex',justifyContent:'space-between',gap:'1rem',marginBottom:'.7rem',fontSize:'.85rem'}}>
                      <span>{it.emoji} {it.name} × {it.qty}</span>
                      <span style={{fontWeight:600,whiteSpace:'nowrap'}}>{(it.price * it.qty).toLocaleString('fr-DZ')} DA</span>
                    </div>
                  ))}
                  <div style={{borderTop:'1.5px solid var(--black)',marginTop:'1rem',paddingTop:'.9rem',display:'flex',justifyContent:'space-between',fontFamily:'var(--display)',fontSize:'1.05rem'}}>
                    <span>TOTAL</span>
                    <span style={{color:'var(--green)'}}>{Number(result.total || 0).toLocaleString('fr-DZ')} DA</span>
                  </div>
                  {result.technique && (
                    <div style={{marginTop:'1rem',padding:'.7rem',background:'var(--green-pale)',borderRadius:'4px',fontSize:'.8rem',color:'var(--green)',fontWeight:600}}>
                      🔧 {result.technique}
                    </div>
                  )}
                  {result.wilaya && (
                    <div style={{marginTop:'.5rem',padding:'.7rem',background:'var(--cream)',borderRadius:'4px',fontSize:'.78rem',color:'var(--muted)'}}>
                      📍 {result.wilaya}
                    </div>
                  )}
                </div>
              </div>

              <a href={waFollowUp} target="_blank" rel="noopener noreferrer" className="btn-g" style={{width:'100%',justifyContent:'center'}}>
                💬 Demander le statut
              </a>
            </div>
          </div>
        )}

        {/* ── NOT FOUND ── */}
        {searched && !result && (
          <div style={{
            marginTop:'2.5rem', maxWidth:640, background:'var(--white)',
            border:'1.5px solid var(--cream-border)', borderRadius:'20px', padding:'2rem',
          }}>
            <div style={{fontSize:'2rem',marginBottom:'.8rem'}}>🔎</div>
            <h2 style={{fontFamily:'var(--display)',fontSize:'1.3rem',marginBottom:'.7rem'}}>
              Référence introuvable sur cet appareil
            </h2>
            <p style={{fontSize:'.88rem',color:'var(--muted)',lineHeight:1.8,marginBottom:'1.2rem'}}>
              Le détail d'une commande est conservé sur l'appareil qui l'a passée. Si vous
              avez commandé depuis un autre téléphone ou ordinateur — ou effacé les données
              de votre navigateur — la référence n'apparaîtra pas ici. Votre commande, elle,
              reste bien enregistrée chez nous : envoyez-nous la référence sur WhatsApp et
              nous vous répondons avec l'état exact.
            </p>
            <div style={{display:'flex',gap:'.8rem',flexWrap:'wrap'}}>
              <a href={`https://wa.me/${WA}?text=${encodeURIComponent(`Bonjour Djimmy Prints, je souhaite le statut de ma commande ${normalizeRef(ref) || ''}`)}`}
                target="_blank" rel="noopener noreferrer" className="btn-g">
                💬 Demander sur WhatsApp
              </a>
              <a href={`tel:+${WA}`} className="btn-outline">📞 {PHONE_DISPLAY}</a>
            </div>
          </div>
        )}

        {/* ── STAGES EXPLAINER (before any search) ── */}
        {!searched && (
          <div style={{marginTop:'4rem'}}>
            <h2 className="s-ttl" style={{fontSize:'clamp(1.5rem,3vw,2.1rem)',marginBottom:'2rem'}}>
              Les <span className="kw">5 étapes</span> d'une commande
            </h2>
            <div className="cards-sm">
              {ORDER_STAGES.map((s, i) => (
                <div key={s.key} style={{
                  background:'var(--white)', border:'1.5px solid var(--cream-border)',
                  borderRadius:'16px', padding:'1.6rem 1.4rem',
                }}>
                  <div style={{fontSize:'1.6rem',marginBottom:'.7rem'}}>{s.ic}</div>
                  <div style={{fontSize:'.68rem',fontWeight:700,letterSpacing:'.12em',textTransform:'uppercase',color:'var(--green)',marginBottom:'.3rem'}}>
                    Étape {i + 1}
                  </div>
                  <div style={{fontFamily:'var(--display)',fontSize:'1.05rem',letterSpacing:'.02em',marginBottom:'.4rem'}}>{s.label}</div>
                  <p style={{fontSize:'.82rem',color:'var(--muted)',lineHeight:1.7}}>{s.desc}</p>
                </div>
              ))}
            </div>

            <div style={{marginTop:'2.5rem',display:'flex',gap:'1rem',flexWrap:'wrap'}}>
              <Link href="/commande" className="btn-g">Passer une commande</Link>
              <Link href="/devis" className="btn-outline">Demander un devis</Link>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
