import Head from 'next/head'
import Link from 'next/link'
import { useState } from 'react'
import { PRODUCTS } from '../lib/products'
import ProductImg from '../components/ProductImg'
import { WA, SIZES, COLORS, TECHNIQUES, WILAYAS } from '../lib/constants'
import { newOrderRef, saveOrder } from '../lib/orders'

export default function Commande() {
  const [step, setStep] = useState(1)
  const [order, setOrder] = useState({
    prods: [],          // [{name, emoji, price, qty, color, sizes:{S:2,M:3,...}}]
    technique: '',
    logo: null,
    logoName: '',
    notes: '',
  })
  const [form, setForm] = useState({ nom:'', tel:'', entreprise:'', wilaya:'', adresse:'', email:'' })
  const [payMode, setPayMode] = useState('livraison')
  const [done, setDone] = useState(false)
  const [orderRef, setOrderRef] = useState('')

  // Add product to order
  const [selProd, setSelProd] = useState(PRODUCTS[0])
  const [selColor, setSelColor] = useState('Blanc')
  const [selSizes, setSelSizes] = useState({})

  const addProduct = () => {
    const totalQty = Object.values(selSizes).reduce((a,b)=>a+(+b||0),0)
    if(totalQty === 0) { alert('Ajoutez au moins 1 pièce.'); return }
    setOrder(o => ({
      ...o,
      prods: [...o.prods, { ...selProd, qty: totalQty, color: selColor, sizes: {...selSizes} }]
    }))
    setSelSizes({})
  }

  const removeProduct = (i) => setOrder(o=>({...o,prods:o.prods.filter((_,idx)=>idx!==i)}))

  const calcTotal = () => {
    const sub = order.prods.reduce((a,p)=>a+p.price*p.qty,0)
    const totalQty = order.prods.reduce((a,p)=>a+p.qty,0)
    let disRate = 0
    if(totalQty>=200) disRate=.15
    else if(totalQty>=100) disRate=.1
    else if(totalQty>=50) disRate=.05
    const volDis = Math.round(sub*disRate)
    const afterVol = sub - volDis
    const payDis = payMode!=='livraison' ? Math.round(afterVol*.1) : 0
    return { sub, volDis, disRate, payDis, final: afterVol - payDis, totalQty }
  }

  const handleLogoUpload = (e) => {
    const f = e.target.files[0]
    if(!f) return
    setOrder(o=>({...o, logo:f, logoName:f.name}))
  }

  const submitOrder = () => {
    if(!form.nom || !form.tel) { alert('Nom et téléphone obligatoires.'); return }
    if(!form.wilaya) { alert('Sélectionnez votre wilaya.'); return }
    if(!form.adresse) { alert('Adresse de livraison obligatoire.'); return }
    if(order.prods.length === 0) { alert('Ajoutez au moins un produit.'); return }

    const { sub, volDis, disRate, payDis, final, totalQty } = calcTotal()
    // The reference goes into the WhatsApp message AND into the local order
    // book, so /suivi can show the customer their own order back.
    const ref = newOrderRef()
    const payLabel = {livraison:'Paiement à la livraison',ccp:'CCP / Baridimob (−10%)',cib:'CIB / Edahabia (−10%)'}[payMode]

    const prodLines = order.prods.map(p => {
      const szLine = Object.entries(p.sizes).filter(([,v])=>+v>0).map(([s,v])=>`${s}:${v}`).join(' | ')
      return `${p.emoji} *${p.name}* (${p.color}) — ${p.qty} pcs × ${p.price.toLocaleString('fr-DZ')} DA${szLine?' → '+szLine:''}`
    }).join('\n')

    const msg = [
      '🖨️ *COMMANDE — DJIMMY PRINTS*',
      `🔖 *Référence :* ${ref}`,
      '━━━━━━━━━━━━━━━━━━',
      `👤 *Nom :* ${form.nom}`,
      form.entreprise ? `🏢 *Entreprise :* ${form.entreprise}` : '',
      `📞 *Tél :* +213${form.tel}`,
      form.email ? `📧 *Email :* ${form.email}` : '',
      `📍 *Wilaya :* ${form.wilaya}`,
      `🏠 *Adresse :* ${form.adresse}`,
      '━━━━━━━━━━━━━━━━━━',
      '📦 *PRODUITS :*',
      prodLines,
      order.technique ? `🔧 *Technique :* ${order.technique}` : '',
      order.logoName ? `📎 *Logo :* ${order.logoName}` : '',
      '━━━━━━━━━━━━━━━━━━',
      `💳 *Paiement :* ${payLabel}`,
      `📦 *Quantité totale :* ${totalQty} pièces`,
      `💰 *Sous-total :* ${sub.toLocaleString('fr-DZ')} DA`,
      disRate>0 ? `🏷️ *Remise volume (${disRate*100}%) :* −${volDis.toLocaleString('fr-DZ')} DA` : '',
      payMode!=='livraison' ? `💳 *Remise paiement anticipé :* −${payDis.toLocaleString('fr-DZ')} DA` : '',
      `✅ *TOTAL : ${final.toLocaleString('fr-DZ')} DA*`,
      order.notes ? `\n💬 *Notes :*\n${order.notes}` : '',
      '━━━━━━━━━━━━━━━━━━',
      `📅 ${new Date().toLocaleDateString('fr-DZ',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}`,
      '_djimmyprints.xyz_',
    ].filter(Boolean).join('\n')

    // Record it server-side too, so the customer can track the order from a
    // different device than the one they ordered on. Fire-and-forget on
    // purpose: WhatsApp is the real channel, and a database hiccup must
    // never stop the order from being sent.
    fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ref,
        customer: {
          nom: form.nom, tel: form.tel, entreprise: form.entreprise,
          email: form.email, wilaya: form.wilaya, adresse: form.adresse,
        },
        items: order.prods.map(p => ({ emoji:p.emoji, name:p.name, price:p.price, qty:p.qty, color:p.color })),
        total: final,
        technique: order.technique,
        notes: order.notes,
      }),
    }).catch(() => {})

    saveOrder({
      ref,
      createdAt: Date.now(),
      date: new Date().toLocaleDateString('fr-DZ', { year:'numeric', month:'long', day:'numeric' }),
      stage: 'recue',
      items: order.prods.map(p => ({ emoji:p.emoji, name:p.name, price:p.price, qty:p.qty, color:p.color })),
      total: final,
      technique: order.technique,
      wilaya: form.wilaya,
    })

    window.open(`https://wa.me/${WA}?text=${encodeURIComponent(msg)}`, '_blank')
    if(typeof fbq!=='undefined') fbq('track','Purchase',{value:final,currency:'DZD'})
    setOrderRef(ref)
    setDone(true)
  }

  const { sub, volDis, disRate, payDis, final, totalQty } = calcTotal()

  const inputStyle = {
    width:'100%', padding:'.75rem 1rem', border:'1.5px solid var(--cream-border)',
    borderRadius:'4px', fontSize:'.9rem', fontFamily:'inherit',
    background:'var(--white)', color:'var(--black)', outline:'none',
    transition:'border-color .2s',
  }
  const labelStyle = { display:'block', fontSize:'.75rem', fontWeight:600, letterSpacing:'.05em', textTransform:'uppercase', color:'var(--muted)', marginBottom:'.4rem' }

  if(done) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',padding:'2.5rem 1.15rem',position:'relative',zIndex:1}}>
      <div style={{textAlign:'center',maxWidth:520}}>
        <div style={{fontSize:'4rem',marginBottom:'1.5rem'}}>✅</div>
        <h2 style={{fontFamily:'var(--display)',fontSize:'2rem',marginBottom:'1rem'}}>Commande envoyée !</h2>

        {orderRef && (
          <div style={{
            background:'var(--white)', border:'1.5px solid var(--green)', borderRadius:'20px',
            padding:'1.4rem', marginBottom:'1.8rem',
          }}>
            <div style={{fontSize:'.72rem',fontWeight:700,letterSpacing:'.12em',textTransform:'uppercase',color:'var(--muted)',marginBottom:'.4rem'}}>
              Votre référence
            </div>
            <div className="u-mono" style={{fontFamily:'var(--display)',fontSize:'2rem',color:'var(--green)',lineHeight:1.1}}>
              {orderRef}
            </div>
            <p style={{fontSize:'.78rem',color:'var(--muted)',marginTop:'.6rem',lineHeight:1.6}}>
              Notez-la : elle vous permet de suivre l'avancement de votre commande.
            </p>
          </div>
        )}

        <p style={{color:'var(--muted)',lineHeight:1.8,marginBottom:'2rem'}}>
          Votre commande a été envoyée sur WhatsApp. Notre équipe vous recontacte dans les 24h pour confirmer et procéder à la production.
        </p>

        <div style={{display:'flex',gap:'1rem',justifyContent:'center',flexWrap:'wrap'}}>
          {orderRef && (
            <Link href={`/suivi?ref=${orderRef}`} className="btn-g">
              Suivre ma commande
            </Link>
          )}
          <button onClick={()=>{setDone(false);setStep(1);setOrderRef('');setOrder({prods:[],technique:'',logo:null,logoName:'',notes:''});setForm({nom:'',tel:'',entreprise:'',wilaya:'',adresse:'',email:''})}}
            className="btn-outline">
            Nouvelle commande
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      <Head>
        <title>Commander — Djimmy Prints</title>
        <meta name="description" content="Commandez vos uniformes personnalisés. Wizard en 3 étapes, envoi direct WhatsApp." />
      </Head>

      <div style={{padding:'1.6rem 1.15rem 2.5rem',position:'relative',zIndex:1}}>
        <p className="s-lbl">Wizard commande</p>
        <h1 className="s-ttl">Configurez votre <span className="kw">commande</span></h1>

        {/* Steps indicator */}
        <div style={{display:'flex',gap:0,marginTop:'2rem',marginBottom:'3rem',maxWidth:500}}>
          {['Produits','Personnalisation','Livraison & Paiement'].map((s,i) => (
            <div key={s} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:'.4rem',cursor:'pointer'}} onClick={()=>{ if(i<step-1) setStep(i+1) }}>
              <div style={{
                width:32,height:32,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',
                fontWeight:700,fontSize:'.8rem',
                background: step>=i+1 ? 'var(--grad)' : 'rgba(255,255,255,.07)',
                color: step>=i+1 ? '#fff' : 'var(--muted)',
                transition:'all .3s',
              }}>
                {step>i+1 ? '✓' : i+1}
              </div>
              <div style={{fontSize:'.68rem',fontWeight:600,color:step===i+1?'var(--green)':'var(--muted)',textAlign:'center',textTransform:'uppercase',letterSpacing:'.06em'}}>{s}</div>
              {i<2 && <div style={{position:'absolute',width:'calc(33% - 32px)',height:'2px',background:step>i+1?'var(--green)':'var(--cream-border)',marginTop:'16px',marginLeft:'calc(16px + 33%)'}} />}
            </div>
          ))}
        </div>

        <div className="grid-side rv">
          {/* LEFT — Wizard steps */}
          <div>

            {/* ── STEP 1 : PRODUITS ── */}
            {step===1 && (
              <div>
                <h3 style={{fontFamily:'var(--display)',fontSize:'1.2rem',marginBottom:'1.5rem'}}>1. Choisissez vos produits</h3>

                {/* Product picker */}
                <div className="pick-grid" style={{marginBottom:'1.5rem'}}>
                  {PRODUCTS.map(p => (
                    <button key={p.name} onClick={()=>setSelProd(p)} style={{
                      padding:'1rem .8rem',border:'1.5px solid',borderRadius:'16px',cursor:'pointer',
                      fontFamily:'inherit',textAlign:'center',transition:'all .2s',
                      borderColor: selProd.name===p.name ? 'var(--green)' : 'var(--cream-border)',
                      background: selProd.name===p.name ? 'var(--green-pale)' : 'var(--white)',
                    }}>
                      <ProductImg product={p} size={62} radius={12} style={{margin:'0 auto .5rem'}} />
                      <div style={{fontWeight:700,fontSize:'.8rem'}}>{p.name}</div>
                      <div style={{fontSize:'.72rem',color:'var(--green)',fontWeight:600,marginTop:'.2rem'}}>{p.price.toLocaleString()} DA</div>
                    </button>
                  ))}
                </div>

                {/* Color */}
                <div style={{marginBottom:'1.2rem'}}>
                  <label style={labelStyle}>Couleur</label>
                  <div style={{display:'flex',gap:'.5rem',flexWrap:'wrap'}}>
                    {COLORS.map(c=>(
                      <button key={c} onClick={()=>setSelColor(c)} style={{
                        padding:'.3rem .8rem',fontSize:'.75rem',border:'1.5px solid',borderRadius:'3px',cursor:'pointer',fontFamily:'inherit',fontWeight:500,
                        borderColor:selColor===c?'var(--green)':'var(--cream-border)',
                        background:selColor===c?'var(--green)':'var(--cream)',
                        color:selColor===c?'#fff':'var(--black)',
                      }}>{c}</button>
                    ))}
                  </div>
                </div>

                {/* Sizes */}
                <div style={{marginBottom:'1.5rem'}}>
                  <label style={labelStyle}>Quantités par taille</label>
                  <div className="sizes-grid">
                    {SIZES.map(s=>(
                      <div key={s} style={{textAlign:'center'}}>
                        <div style={{fontSize:'.7rem',fontWeight:700,color:'var(--muted)',marginBottom:'.3rem'}}>{s}</div>
                        <input type="number" min="0" max="9999" value={selSizes[s]||''} placeholder="0"
                          onChange={e=>setSelSizes(sz=>({...sz,[s]:+e.target.value||0}))}
                          style={{...inputStyle,padding:'.5rem',textAlign:'center',fontSize:'.85rem'}} />
                      </div>
                    ))}
                  </div>
                </div>

                <button onClick={addProduct} className="btn-outline" style={{marginBottom:'2rem'}}>
                  + Ajouter au panier
                </button>

                {/* Added products */}
                {order.prods.length>0 && (
                  <div style={{marginBottom:'2rem'}}>
                    <label style={labelStyle}>Produits ajoutés</label>
                    {order.prods.map((p,i)=>(
                      <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'.8rem 1rem',background:'var(--white)',border:'1px solid var(--cream-border)',borderRadius:'4px',marginBottom:'.5rem'}}>
                        <div>
                          <span style={{marginLeft:'.5rem',fontWeight:600}}>{p.emoji} {p.name}</span>
                          <span style={{fontSize:'.75rem',color:'var(--muted)',marginRight:'.5rem'}}> · {p.color} · {p.qty} pcs</span>
                        </div>
                        <div style={{display:'flex',alignItems:'center',gap:'1rem'}}>
                          <span style={{color:'var(--green)',fontWeight:700}}>{(p.price*p.qty).toLocaleString()} DA</span>
                          <button onClick={()=>removeProduct(i)} style={{border:'none',background:'none',cursor:'pointer',color:'var(--muted)',fontSize:'1.1rem'}}>✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <button onClick={()=>{if(order.prods.length===0){alert('Ajoutez au moins un produit.');return}setStep(2)}} className="btn-g">
                  Continuer →
                </button>
              </div>
            )}

            {/* ── STEP 2 : PERSONNALISATION ── */}
            {step===2 && (
              <div>
                <h3 style={{fontFamily:'var(--display)',fontSize:'1.2rem',marginBottom:'1.5rem'}}>2. Personnalisation</h3>

                <div style={{marginBottom:'1.5rem'}}>
                  <label style={labelStyle}>Technique d'impression</label>
                  <div className="pick-grid">
                    {TECHNIQUES.map(t=>(
                      <button key={t} onClick={()=>setOrder(o=>({...o,technique:t}))} style={{
                        padding:'.8rem 1rem',border:'1.5px solid',borderRadius:'16px',cursor:'pointer',fontFamily:'inherit',fontSize:'.82rem',fontWeight:600,
                        borderColor:order.technique===t?'var(--green)':'var(--cream-border)',
                        background:order.technique===t?'var(--green-pale)':'var(--white)',
                        color:order.technique===t?'var(--green)':'var(--black)',
                        transition:'all .2s',textAlign:'center',
                      }}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Logo upload */}
                <div style={{marginBottom:'1.5rem'}}>
                  <label style={labelStyle}>Votre logo (PNG, SVG, PDF vectoriel)</label>
                  <div
                    style={{border:'2px dashed var(--cream-border)',borderRadius:'16px',padding:'2rem',textAlign:'center',cursor:'pointer',background:'var(--cream)'}}
                    onClick={()=>document.getElementById('logoUpload').click()}
                  >
                    {order.logoName ? (
                      <div>
                        <div style={{fontSize:'2rem',marginBottom:'.5rem'}}>✅</div>
                        <div style={{fontWeight:600}}>{order.logoName}</div>
                        <div style={{fontSize:'.75rem',color:'var(--muted)',marginTop:'.3rem'}}>Cliquez pour changer</div>
                      </div>
                    ) : (
                      <div>
                        <div style={{fontSize:'2rem',marginBottom:'.5rem'}}>📁</div>
                        <div style={{fontWeight:600,marginBottom:'.3rem'}}>Uploadez votre logo</div>
                        <div style={{fontSize:'.75rem',color:'var(--muted)'}}>PNG, SVG, PDF, AI — haute résolution recommandée</div>
                      </div>
                    )}
                    <input id="logoUpload" type="file" accept=".png,.jpg,.svg,.pdf,.ai" style={{display:'none'}} onChange={handleLogoUpload} />
                  </div>
                  <p style={{fontSize:'.75rem',color:'var(--muted)',marginTop:'.5rem'}}>
                    💡 Pas de logo ? Notre équipe peut vous aider à le vectoriser. Mentionnez-le dans les notes.
                  </p>
                </div>

                {/* Notes */}
                <div style={{marginBottom:'2rem'}}>
                  <label style={labelStyle}>Notes & instructions</label>
                  <textarea
                    rows={4} placeholder="Couleur du fil broderie, position logo, texte personnalisé, date de livraison souhaitée..."
                    value={order.notes} onChange={e=>setOrder(o=>({...o,notes:e.target.value}))}
                    style={{...inputStyle,resize:'vertical'}}
                  />
                </div>

                <div style={{display:'flex',gap:'1rem'}}>
                  <button onClick={()=>setStep(1)} className="btn-outline">← Retour</button>
                  <button onClick={()=>setStep(3)} className="btn-g">Continuer →</button>
                </div>
              </div>
            )}

            {/* ── STEP 3 : LIVRAISON & PAIEMENT ── */}
            {step===3 && (
              <div>
                <h3 style={{fontFamily:'var(--display)',fontSize:'1.2rem',marginBottom:'1.5rem'}}>3. Livraison & Paiement</h3>

                <div className="field-2">
                  <div>
                    <label style={labelStyle}>Nom complet *</label>
                    <input style={inputStyle} placeholder="Votre nom" value={form.nom} onChange={e=>setForm(f=>({...f,nom:e.target.value}))} />
                  </div>
                  <div>
                    <label style={labelStyle}>Téléphone *</label>
                    <div style={{display:'flex',alignItems:'center',border:'1.5px solid var(--cream-border)',borderRadius:'4px',background:'var(--white)',overflow:'hidden'}}>
                      <span style={{padding:'0 .8rem',fontSize:'.85rem',color:'var(--muted)',borderRight:'1px solid var(--cream-border)',whiteSpace:'nowrap'}}>+213</span>
                      <input style={{...inputStyle,border:'none',borderRadius:0}} placeholder="06/07..." value={form.tel} onChange={e=>setForm(f=>({...f,tel:e.target.value}))} />
                    </div>
                  </div>
                </div>

                <div className="field-2">
                  <div>
                    <label style={labelStyle}>Entreprise</label>
                    <input style={inputStyle} placeholder="Optionnel" value={form.entreprise} onChange={e=>setForm(f=>({...f,entreprise:e.target.value}))} />
                  </div>
                  <div>
                    <label style={labelStyle}>Email</label>
                    <input style={inputStyle} type="email" placeholder="Optionnel" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} />
                  </div>
                </div>

                <div style={{marginBottom:'1rem'}}>
                  <label style={labelStyle}>Wilaya *</label>
                  <select style={inputStyle} value={form.wilaya} onChange={e=>setForm(f=>({...f,wilaya:e.target.value}))}>
                    <option value="">Sélectionnez votre wilaya</option>
                    {WILAYAS.map(w=><option key={w} value={w}>{w}</option>)}
                  </select>
                </div>

                <div style={{marginBottom:'2rem'}}>
                  <label style={labelStyle}>Adresse de livraison *</label>
                  <textarea rows={2} style={{...inputStyle,resize:'vertical'}} placeholder="Rue, quartier, code postal..."
                    value={form.adresse} onChange={e=>setForm(f=>({...f,adresse:e.target.value}))} />
                </div>

                {/* Mode paiement */}
                <div style={{marginBottom:'2rem'}}>
                  <label style={labelStyle}>Mode de paiement</label>
                  <div className="pay-grid">
                    {[
                      {key:'livraison',label:'À la livraison',ic:'🚚',sub:'Standard'},
                      {key:'ccp',label:'CCP / Baridimob',ic:'🏦',sub:'−10% de remise'},
                      {key:'cib',label:'CIB / Edahabia',ic:'💳',sub:'−10% de remise'},
                    ].map(m=>(
                      <button key={m.key} onClick={()=>setPayMode(m.key)} style={{
                        padding:'1rem',border:'1.5px solid',borderRadius:'16px',cursor:'pointer',fontFamily:'inherit',textAlign:'center',
                        borderColor:payMode===m.key?'var(--green)':'var(--cream-border)',
                        background:payMode===m.key?'var(--green-pale)':'var(--white)',
                        transition:'all .2s',
                      }}>
                        <div style={{fontSize:'1.5rem',marginBottom:'.3rem'}}>{m.ic}</div>
                        <div style={{fontWeight:700,fontSize:'.8rem',marginBottom:'.2rem'}}>{m.label}</div>
                        <div style={{fontSize:'.7rem',color:payMode===m.key&&m.key!=='livraison'?'var(--green)':'var(--muted)'}}>{m.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{display:'flex',gap:'1rem'}}>
                  <button onClick={()=>setStep(2)} className="btn-outline">← Retour</button>
                  <button onClick={submitOrder} className="btn-g" style={{flex:1,justifyContent:'center'}}>
                    💬 Envoyer sur WhatsApp
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT — Récapitulatif */}
          <div className="sticky-side">
            <div style={{background:'var(--white)',border:'1.5px solid var(--cream-border)',borderRadius:'20px',overflow:'hidden'}}>
              <div style={{padding:'1.2rem 1.5rem',borderBottom:'1px solid var(--cream-border)',fontFamily:'var(--display)',fontSize:'1rem',letterSpacing:'.04em'}}>
                📋 Récapitulatif
              </div>
              <div style={{padding:'1.5rem'}}>
                {order.prods.length===0 ? (
                  <p style={{fontSize:'.85rem',color:'var(--muted)',textAlign:'center',padding:'1rem 0'}}>
                    Aucun produit ajouté
                  </p>
                ) : (
                  <>
                    {order.prods.map((p,i)=>(
                      <div key={i} style={{display:'flex',justifyContent:'space-between',marginBottom:'.7rem',fontSize:'.85rem'}}>
                        <span>{p.emoji} {p.name} × {p.qty}</span>
                        <span style={{fontWeight:600}}>{(p.price*p.qty).toLocaleString()} DA</span>
                      </div>
                    ))}
                    <div style={{borderTop:'1px solid var(--cream-border)',marginTop:'1rem',paddingTop:'1rem'}}>
                      <div style={{display:'flex',justifyContent:'space-between',fontSize:'.82rem',color:'var(--muted)',marginBottom:'.5rem'}}>
                        <span>Sous-total ({totalQty} pcs)</span>
                        <span>{sub.toLocaleString()} DA</span>
                      </div>
                      {volDis>0 && (
                        <div style={{display:'flex',justifyContent:'space-between',fontSize:'.82rem',color:'var(--green)',marginBottom:'.5rem'}}>
                          <span>🏷️ Remise volume ({(disRate*100).toFixed(0)}%)</span>
                          <span>−{volDis.toLocaleString()} DA</span>
                        </div>
                      )}
                      {payDis>0 && (
                        <div style={{display:'flex',justifyContent:'space-between',fontSize:'.82rem',color:'var(--green)',marginBottom:'.5rem'}}>
                          <span>💳 Remise paiement anticipé</span>
                          <span>−{payDis.toLocaleString()} DA</span>
                        </div>
                      )}
                      <div style={{display:'flex',justifyContent:'space-between',marginTop:'.8rem',paddingTop:'.8rem',borderTop:'1.5px solid var(--black)',fontFamily:'var(--display)',fontSize:'1.1rem'}}>
                        <span>TOTAL</span>
                        <span style={{color:'var(--green)'}}>{final.toLocaleString()} DA</span>
                      </div>
                    </div>
                  </>
                )}

                {order.technique && (
                  <div style={{marginTop:'1rem',padding:'.7rem',background:'var(--green-pale)',borderRadius:'4px',fontSize:'.8rem',color:'var(--green)',fontWeight:600}}>
                    🔧 {order.technique}
                  </div>
                )}
                {order.logoName && (
                  <div style={{marginTop:'.5rem',padding:'.7rem',background:'var(--cream)',borderRadius:'4px',fontSize:'.75rem',color:'var(--muted)'}}>
                    📎 {order.logoName}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
