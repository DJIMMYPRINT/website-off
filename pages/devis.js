import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import AskTenues from '../components/AskTenues'
import { PRODUCTS , hasPriceGrid, priceRange } from '../lib/products'
import ProductImg from '../components/ProductImg'
import { WA, TECHNIQUES, WILAYAS, EMAIL, PHONE_DISPLAY, MIN_ORDER } from '../lib/constants'
import Ico from '../components/Ico'

// Deadlines are coarse on purpose — the exact date is settled on WhatsApp once
// the artwork is in hand, so asking for a precise one here would be false
// precision.
// Clients who already own their garments only need the DTF + flocage
// service: they name the kind of garment instead of picking from our catalogue.
const OWN_TYPES = ['Polos','T-shirts','Chemises','Vestes','Gilets','Tabliers','Pantalons','Casquettes','Autre']
const OWN_TECH = 'DTF + flocage'

const DELAIS = ['Dès que possible', 'Sous 1 semaine', 'Sous 2 semaines', 'Sous 1 mois', 'Pas encore fixé']

const inputStyle = {
  width:'100%', padding:'.75rem 1rem', border:'1.5px solid var(--cream-border)',
  borderRadius:'4px', fontSize:'.9rem', fontFamily:'inherit',
  background:'var(--white)', color:'var(--black)', outline:'none',
}
const labelStyle = {
  display:'block', fontSize:'.75rem', fontWeight:600, letterSpacing:'.05em',
  textTransform:'uppercase', color:'var(--muted)', marginBottom:'.4rem',
}

export default function Devis() {
  const router = useRouter()
  // null until the visitor answers the opening question: our garments
  // ('catalogue') or their own ('propres').
  const [mode, setMode] = useState(null)
  const [own, setOwn] = useState([])
  const [hiddenTip, setHiddenTip] = useState('')
  const [picked, setPicked] = useState([])
  const [qty, setQty] = useState('')
  const [technique, setTechnique] = useState('')
  const [delai, setDelai] = useState(DELAIS[0])
  const [form, setForm] = useState({ nom:'', tel:'', entreprise:'', email:'', wilaya:'', notes:'' })
  const [err, setErr] = useState('')
  const [sent, setSent] = useState(false)

  // The homepage card « Flocage sur vos tenues » links here with
  // ?tenues=client, which already answers the opening question.
  useEffect(() => {
    if (router.isReady && router.query.tenues === 'client') setMode('propres')
  }, [router.isReady, router.query.tenues])

  const propres = mode === 'propres'
  const toggle = (name) =>
    setPicked(p => p.includes(name) ? p.filter(x => x !== name) : [...p, name])
  const toggleOwn = (name) =>
    setOwn(p => p.includes(name) ? p.filter(x => x !== name) : [...p, name])
  const chosen = propres ? own : picked

  // Each step the guide walks through, in order. The first one not done yet
  // is the one the guide pop-up points at.
  const nQty = parseInt(qty, 10)
  const steps = [
    { id: 'tenues', done: chosen.length > 0,
      t: propres ? 'Quelles tenues avez-vous ?' : 'Choisissez vos tenues',
      d: propres ? 'Touchez le type de tenues à marquer : polos, vestes, tabliers…'
                 : 'Touchez une ou plusieurs tenues du catalogue à chiffrer.' },
    { id: 'quantite', done: nQty >= MIN_ORDER,
      t: 'Indiquez la quantité', d: `Le nombre total de pièces, ${MIN_ORDER} minimum.` },
    { id: 'contact', done: !!(form.nom.trim() && form.tel.trim()),
      t: 'Vos coordonnées', d: 'Votre nom et votre téléphone, pour vous envoyer le devis.' },
  ]
  const stepIdx = steps.findIndex(st => !st.done)
  const tip = stepIdx === -1
    ? { id: 'envoyer', t: 'Tout est prêt', d: 'Envoyez votre demande : elle part sur WhatsApp.', n: steps.length + 1 }
    : { ...steps[stepIdx], n: stepIdx + 1 }
  // Typing a quantity before choosing the garments: remind them to start there.
  if (tip.id === 'tenues' && qty) tip.t = propres ? "D'abord, vos tenues" : "D'abord, choisissez vos tenues"
  const goTo = (id) => {
    const el = document.getElementById(`step-${id}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  // Rough budget band from list prices, before the volume discount the order
  // wizard applies. Deliberately framed as an estimate, not a quote.
  const estimate = () => {
    const n = parseInt(qty, 10)
    if (!n || picked.length === 0) return null
    // Both ends of the estimate come from the real range, so a product with
    // a price grid cannot make the high end look cheaper than it is.
    const ranges = PRODUCTS.filter(p => picked.includes(p.name)).map(priceRange)
    const lo = Math.min(...ranges.map(r => r[0])) * n
    const hi = Math.max(...ranges.map(r => r[1])) * n
    return { lo, hi, n }
  }

  const send = () => {
    if (chosen.length === 0) { setErr(propres ? 'Indiquez quelles tenues vous avez.' : 'Sélectionnez au moins un produit à chiffrer.'); goTo('tenues'); return }
    const n = parseInt(qty, 10)
    if (!n || n < MIN_ORDER) { setErr(`La quantité minimum est de ${MIN_ORDER} pièces.`); goTo('quantite'); return }
    if (!form.nom.trim() || !form.tel.trim()) { setErr('Votre nom et votre téléphone sont obligatoires.'); goTo('contact'); return }
    setErr('')

    const est = propres ? null : estimate()
    const msg = [
      '📝 *DEMANDE DE DEVIS — DJIMMY PRINTS*',
      '━━━━━━━━━━━━━━━━━━',
      `👤 *Nom :* ${form.nom}`,
      form.entreprise ? `🏢 *Entreprise :* ${form.entreprise}` : '',
      `📞 *Tél :* +213${form.tel}`,
      form.email ? `📧 *Email :* ${form.email}` : '',
      form.wilaya ? `📍 *Wilaya :* ${form.wilaya}` : '',
      '━━━━━━━━━━━━━━━━━━',
      propres ? `🧥 *Service :* flocage sur les tenues du client (${OWN_TECH})` : '',
      propres ? `👕 *Tenues du client :* ${own.join(', ')}` : `👕 *Produits :* ${picked.join(', ')}`,
      `🔢 *Quantité estimée :* ${n} pièces`,
      propres ? '' : technique ? `🔧 *Technique souhaitée :* ${technique}` : '🔧 *Technique :* à conseiller',
      `⏱️ *Délai souhaité :* ${delai}`,
      est ? `💰 *Ordre de budget (avant remise) :* ${est.lo.toLocaleString('fr-DZ')} – ${est.hi.toLocaleString('fr-DZ')} DA` : '',
      form.notes ? `\n💬 *Précisions :*\n${form.notes}` : '',
      '━━━━━━━━━━━━━━━━━━',
      '_Demande envoyée depuis djimmyprints.xyz_',
    ].filter(Boolean).join('\n')

    window.open(`https://wa.me/${WA}?text=${encodeURIComponent(msg)}`, '_blank')
    if (typeof fbq !== 'undefined') fbq('track', 'Lead')
    setSent(true)
  }

  const est = propres ? null : estimate()

  if (sent) return (
    <div style={{minHeight:'70vh',display:'flex',alignItems:'center',justifyContent:'center',padding:'1.6rem 1.15rem 2.5rem',position:'relative',zIndex:1}}>
      <div style={{textAlign:'center',maxWidth:520}}>
        <div style={{width:72,height:72,margin:'0 auto 1.5rem',borderRadius:'50%',background:'var(--green-pale)',color:'var(--green)',display:'grid',placeItems:'center'}}><Ico n="check" size={34} stroke={2.2} /></div>
        <h1 className="s-ttl" style={{marginBottom:'1rem'}}>Demande <span className="kw">envoyée</span></h1>
        <p style={{color:'var(--muted)',lineHeight:1.8,marginBottom:'2rem'}}>
          Votre demande de devis part sur WhatsApp. Nous revenons vers vous avec un
          chiffrage détaillé sous 24h ouvrables. Si la fenêtre WhatsApp ne s'est pas
          ouverte, écrivez-nous au {PHONE_DISPLAY} ou à {EMAIL}.
        </p>
        <div style={{display:'flex',gap:'1rem',justifyContent:'center',flexWrap:'wrap'}}>
          <Link href="/catalogue" className="btn-outline">Voir le catalogue</Link>
          <button onClick={() => setSent(false)} className="btn-g">Nouvelle demande</button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      <Head>
        <title>Devis Gratuit — Djimmy Prints</title>
        <meta name="description" content="Demandez un devis gratuit pour vos uniformes personnalisés : produits, quantité, technique de marquage. Réponse sous 24h, livraison dans les 58 wilayas." />
      </Head>

      <div style={{padding:'1.6rem 1.15rem 2.5rem',position:'relative',zIndex:1}}>
        <p className="s-lbl">Devis gratuit</p>
        <h1 className="s-ttl">Chiffrons votre <span className="kw">projet</span></h1>
        <p className="s-desc">
          Dites-nous ce que vous voulez habiller et en quelle quantité. Vous recevez
          un devis détaillé sous 24h ouvrables — sans engagement.
        </p>

        <div className="grid-side rv" style={{marginTop:'3rem'}}>
          {/* ── FORM ── */}
          <div>
            {/* Réponse à la question d'ouverture, modifiable à tout moment */}
            <div style={{marginBottom:'1.6rem'}}>
              <label style={labelStyle}>Vos tenues</label>
              <div style={{display:'flex',gap:'.5rem',flexWrap:'wrap'}}>
                {[['catalogue','Je choisis chez vous'],['propres',"J'ai déjà mes tenues"]].map(([m, l]) => {
                  const on = (mode || 'catalogue') === m
                  return (
                    <button key={m} type="button" onClick={() => setMode(m)} style={{
                      padding:'.5rem 1rem', fontSize:'.82rem', border:'1.5px solid', borderRadius:'var(--r-s)',
                      cursor:'pointer', fontFamily:'inherit', fontWeight:600,
                      borderColor: on ? 'var(--green)' : 'var(--cream-border)',
                      background: on ? 'var(--green)' : 'var(--cream)',
                      color: on ? '#fff' : 'var(--black)',
                    }}>{l}</button>
                  )
                })}
              </div>
            </div>

            {propres ? (
            <div id="step-tenues" style={{marginBottom:'2rem'}}>
              <label style={labelStyle}>1. Quelles tenues avez-vous ? * <span style={{textTransform:'none',letterSpacing:0,fontWeight:400}}>(plusieurs choix possibles)</span></label>
              <div style={{display:'flex',gap:'.5rem',flexWrap:'wrap'}}>
                {OWN_TYPES.map(t => {
                  const on = own.includes(t)
                  return (
                    <button key={t} type="button" onClick={() => toggleOwn(t)} style={{
                      padding:'.55rem 1rem', fontSize:'.85rem', border:'1.5px solid', borderRadius:'var(--r-s)',
                      cursor:'pointer', fontFamily:'inherit', fontWeight:600,
                      borderColor: on ? 'var(--green)' : 'var(--cream-border)',
                      background: on ? 'var(--green-pale)' : 'var(--white)',
                      color: on ? 'var(--green)' : 'var(--black)',
                    }}>{on ? '✓ ' : ''}{t}</button>
                  )
                })}
              </div>
            </div>
            ) : (
            <div id="step-tenues" style={{marginBottom:'2rem'}}>
              <label style={labelStyle}>1. Produits à chiffrer * <span style={{textTransform:'none',letterSpacing:0,fontWeight:400}}>(plusieurs choix possibles)</span></label>
              <div className="pick-grid">
                {PRODUCTS.map(p => {
                  const on = picked.includes(p.name)
                  return (
                    <button key={p.name} type="button" onClick={() => toggle(p.name)} style={{
                      padding:'.55rem .55rem .75rem', border:'1.5px solid', borderRadius:'var(--r)', cursor:'pointer',
                      fontFamily:'inherit', textAlign:'center', transition:'all .2s',
                      borderColor: on ? 'var(--green)' : 'var(--cream-border)',
                      background: on ? 'var(--green-pale)' : 'var(--white)',
                    }}>
                      <ProductImg product={p} fill radius={12} style={{marginBottom:'.5rem'}} />
                      <div style={{fontWeight:700,fontSize:'.78rem',lineHeight:1.3}}>{p.name}</div>
                      <div style={{fontSize:'.7rem',color:'var(--green)',fontWeight:600,marginTop:'.2rem'}}>
                        {hasPriceGrid(p) ? `dès ${priceRange(p)[0].toLocaleString('fr-DZ')}` : p.price.toLocaleString('fr-DZ')} DA
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
            )}

            {/* Quantité + technique */}
            <div className="field-2">
              <div id="step-quantite">
                <label style={labelStyle}>2. Quantité totale * (min. {MIN_ORDER})</label>
                <input style={inputStyle} type="number" min={MIN_ORDER} placeholder={`${MIN_ORDER}`}
                  value={qty} onChange={e => setQty(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>3. Délai souhaité</label>
                <select style={inputStyle} value={delai} onChange={e => setDelai(e.target.value)}>
                  {DELAIS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>

            {propres ? (
            <div style={{marginBottom:'2rem',padding:'1rem 1.1rem',background:'var(--green-pale)',border:'1.5px solid rgba(111,175,82,.3)',borderRadius:'var(--r)',fontSize:'.88rem',lineHeight:1.6}}>
              <strong>4. Marquage : {OWN_TECH}</strong><br/>
              <span style={{color:'var(--muted)'}}>Vous nous confiez vos tenues, nous y appliquons votre logo.</span>
            </div>
            ) : (
            <div style={{marginBottom:'2rem'}}>
              <label style={labelStyle}>4. Technique de marquage</label>
              <div style={{display:'flex',gap:'.5rem',flexWrap:'wrap'}}>
                {['À conseiller', ...TECHNIQUES].map(t => {
                  const val = t === 'À conseiller' ? '' : t
                  const on = technique === val
                  return (
                    <button key={t} type="button" onClick={() => setTechnique(val)} style={{
                      padding:'.45rem .95rem', fontSize:'.8rem', border:'1.5px solid', borderRadius:'var(--r-s)',
                      cursor:'pointer', fontFamily:'inherit', fontWeight:600,
                      borderColor: on ? 'var(--green)' : 'var(--cream-border)',
                      background: on ? 'var(--green)' : 'var(--cream)',
                      color: on ? '#fff' : 'var(--black)',
                    }}>{t}</button>
                  )
                })}
              </div>
            </div>

            )}

            {/* Coordonnées */}
            <h3 id="step-contact" style={{fontFamily:'var(--display)',fontSize:'1.1rem',margin:'0 0 1.2rem'}}>5. Vos coordonnées</h3>
            <div className="field-2">
              <div>
                <label style={labelStyle}>Nom complet *</label>
                <input style={inputStyle} placeholder="Votre nom" value={form.nom}
                  onChange={e => setForm(f => ({...f, nom:e.target.value}))} />
              </div>
              <div>
                <label style={labelStyle}>Téléphone *</label>
                <div style={{display:'flex',alignItems:'center',border:'1.5px solid var(--cream-border)',borderRadius:'4px',background:'var(--white)',overflow:'hidden'}}>
                  <span style={{padding:'0 .8rem',fontSize:'.85rem',color:'var(--muted)',borderRight:'1px solid var(--cream-border)',whiteSpace:'nowrap'}}>+213</span>
                  <input style={{...inputStyle,border:'none',borderRadius:0}} placeholder="06/07..." value={form.tel}
                    onChange={e => setForm(f => ({...f, tel:e.target.value}))} />
                </div>
              </div>
            </div>
            <div className="field-2">
              <div>
                <label style={labelStyle}>Entreprise</label>
                <input style={inputStyle} placeholder="Optionnel" value={form.entreprise}
                  onChange={e => setForm(f => ({...f, entreprise:e.target.value}))} />
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <input style={inputStyle} type="email" placeholder="Optionnel" value={form.email}
                  onChange={e => setForm(f => ({...f, email:e.target.value}))} />
              </div>
            </div>
            <div style={{marginBottom:'1rem'}}>
              <label style={labelStyle}>Wilaya</label>
              <select style={inputStyle} value={form.wilaya} onChange={e => setForm(f => ({...f, wilaya:e.target.value}))}>
                <option value="">Sélectionnez votre wilaya</option>
                {WILAYAS.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
            </div>
            <div style={{marginBottom:'1.5rem'}}>
              <label style={labelStyle}>Précisions</label>
              <textarea rows={4} style={{...inputStyle,resize:'vertical'}}
                placeholder="Couleurs, emplacement du logo, secteur d'activité, contrat annuel..."
                value={form.notes} onChange={e => setForm(f => ({...f, notes:e.target.value}))} />
            </div>

            {err && (
              <p role="alert" style={{color:'var(--warn)',fontSize:'.92rem',fontWeight:600,marginBottom:'1rem',display:'flex',alignItems:'center',gap:'.45rem'}}><Ico n="warn" size={17} /> {err}</p>
            )}

            <button id="step-envoyer" onClick={send} className="btn-g">Recevoir mon devis</button>
          </div>

          {/* ── SIDEBAR ── */}
          <div className="sticky-side">
            <div style={{background:'var(--white)',border:'1.5px solid var(--cream-border)',borderRadius:'var(--r)',overflow:'hidden',marginBottom:'1.2rem'}}>
              <div style={{padding:'1.2rem 1.5rem',borderBottom:'1px solid var(--cream-border)',fontFamily:'var(--display)',fontSize:'1rem',letterSpacing:'.04em'}}>
                Votre demande
              </div>
              <div style={{padding:'1.5rem'}}>
                <div style={{fontSize:'.85rem',marginBottom:'.8rem'}}>
                  <span style={{color:'var(--muted)'}}>{propres ? 'Vos tenues : ' : 'Produits : '}</span>
                  <strong>{chosen.length ? chosen.join(', ') : '—'}</strong>
                </div>
                <div style={{fontSize:'.85rem',marginBottom:'.8rem'}}>
                  <span style={{color:'var(--muted)'}}>Quantité : </span>
                  <strong>{qty ? `${qty} pièces` : '—'}</strong>
                </div>
                <div style={{fontSize:'.85rem',marginBottom:'.8rem'}}>
                  <span style={{color:'var(--muted)'}}>Technique : </span>
                  <strong>{propres ? OWN_TECH : technique || 'À conseiller'}</strong>
                </div>
                <div style={{fontSize:'.85rem'}}>
                  <span style={{color:'var(--muted)'}}>Délai : </span>
                  <strong>{delai}</strong>
                </div>

                {est && (
                  <div style={{marginTop:'1.2rem',paddingTop:'1.2rem',borderTop:'1.5px solid var(--cream-border)'}}>
                    <div style={{fontSize:'.72rem',fontWeight:700,letterSpacing:'.08em',textTransform:'uppercase',color:'var(--muted)',marginBottom:'.4rem'}}>
                      Ordre de budget
                    </div>
                    <div style={{fontFamily:'var(--display)',fontSize:'1.35rem',color:'var(--green)',lineHeight:1.2}}>
                      {est.lo.toLocaleString('fr-DZ')} – {est.hi.toLocaleString('fr-DZ')} DA
                    </div>
                    <p style={{fontSize:'.72rem',color:'var(--muted)',lineHeight:1.6,marginTop:'.5rem'}}>
                      Estimation indicative au tarif catalogue, avant remise volume.
                      Le devis final tient compte de la quantité, de la technique et du marquage.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div style={{background:'var(--green-pale)',border:'1.5px solid rgba(111,175,82,.3)',borderRadius:'var(--r)',padding:'1.3rem'}}>
              <div style={{fontWeight:700,fontSize:'.95rem',marginBottom:'.5rem',display:'flex',alignItems:'center',gap:'.45rem'}}><Ico n="clock" size={17} /> Réponse sous 24h</div>
              <p style={{fontSize:'.8rem',color:'var(--muted)',lineHeight:1.7,marginBottom:'1rem'}}>
                Vous savez déjà exactement ce que vous voulez, tailles comprises ?
                Passez directement par le formulaire de commande.
              </p>
              <Link href="/commande" className="btn-outline" style={{width:'100%',justifyContent:'center'}}>
                Commander directement
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Question d'ouverture ── */}
      {/* ── Question d'ouverture ── */}
      <AskTenues open={mode === null} onNo={() => setMode('catalogue')} onYes={() => setMode('propres')}
        yesLabel={`Oui, j'ai déjà mes tenues (${OWN_TECH})`} />

      {/* ── Guide : une bulle par étape ── */}
      {mode !== null && hiddenTip !== tip.id && (
        <div key={tip.id + tip.t} className="dv-tip" role="status">
          <div className="dv-tip-n">{tip.id === 'envoyer' ? <Ico n="check" size={16} stroke={2.4} /> : tip.n}</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:'.68rem',fontWeight:700,letterSpacing:'.08em',textTransform:'uppercase',color:'var(--green)'}}>
              {tip.id === 'envoyer' ? 'Dernière étape' : `Étape ${tip.n} sur ${steps.length}`}
            </div>
            <div style={{fontWeight:700,fontSize:'.95rem',margin:'.1rem 0 .15rem'}}>{tip.t}</div>
            <div style={{fontSize:'.8rem',color:'var(--muted)',lineHeight:1.5}}>{tip.d}</div>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:'.35rem',alignItems:'flex-end'}}>
            <button type="button" className="dv-tip-x" aria-label="Masquer" onClick={() => setHiddenTip(tip.id)}>✕</button>
            <button type="button" className="dv-tip-go" onClick={() => tip.id === 'envoyer' ? send() : goTo(tip.id)}>
              {tip.id === 'envoyer' ? 'Envoyer' : 'Y aller'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
