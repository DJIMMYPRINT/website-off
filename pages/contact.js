import Head from 'next/head'
import { WA, PHONE_DISPLAY, EMAIL, ADDRESS } from '../lib/constants'
import Ico from '../components/Ico'

const FAQ = [
  { q: 'Quel est le minimum de commande ?', r: '20 pièces minimum. Pour les commandes inférieures, contactez-nous pour un devis personnalisé.' },
  { q: 'Combien de temps pour recevoir ma commande ?', r: 'Entre 3 et 7 jours ouvrables selon votre wilaya et la complexité de la personnalisation.' },
  { q: 'Proposez-vous des contrats annuels ?', r: 'Oui. Nous offrons des tarifs préférentiels pour les contrats annuels avec renouvellement régulier.' },
  { q: 'Puis-je voir un échantillon avant de commander ?', r: 'Oui, contactez-nous sur WhatsApp. Nous vous envoyons des photos de réalisations similaires avant engagement.' },
  { q: 'Livrez-vous dans toute l\'Algérie ?', r: 'Oui, livraison à domicile ou stop desk dans les 58 wilayas.' },
  { q: 'Acceptez-vous les logos complexes ?', r: 'Oui. Envoyez votre logo en haute résolution (SVG, PNG 300dpi min). Si nécessaire, notre équipe peut vectoriser votre logo.' },
]

export default function Contact() {
  return (
    <>
      <Head>
        <title>Contact — Djimmy Prints</title>
        <meta name="description" content="Contactez Djimmy Prints pour un devis gratuit. WhatsApp, email, ou visitez-nous à Aïn Bénian, Alger." />
      </Head>

      <div style={{padding:'1.6rem 1.15rem 2.5rem',position:'relative',zIndex:1}}>
        <p className="s-lbl">Contact & FAQ</p>
        <h1 className="s-ttl">On est là pour <span className="kw">vous aider</span></h1>

        <div className="grid-2 rv" style={{gap:'5rem',marginTop:'4rem'}}>
          {/* LEFT — Contact */}
          <div>
            <h2 style={{fontFamily:'var(--display)',fontSize:'1.4rem',marginBottom:'2rem'}}>Nous contacter</h2>

            {/* Cards contact */}
            {[
              { ic:'wa', title:'WhatsApp', sub:'Réponse en moins de 2h', action:'Écrire maintenant', href:`https://wa.me/${WA}?text=Bonjour Djimmy Prints, je souhaite un devis.`, highlight:true },
              { ic:'phone', title:'Téléphone', sub:PHONE_DISPLAY, action:'Appeler', href:`tel:+${WA}` },
              { ic:'mail', title:'Email', sub:EMAIL, action:'Envoyer un email', href:`mailto:${EMAIL}` },
              { ic:'pin', title:'Adresse', sub:`${ADDRESS}, Algérie`, action:'Voir sur la carte', href:'https://www.google.com/maps?q=Aïn+Bénian+Alger' },
            ].map((c,i) => (
              <a key={i} href={c.href} target={c.href.startsWith('http')?'_blank':'_self'} rel="noopener noreferrer"
                className="c-card"
                style={{
                  padding:'1.4rem 1.5rem',marginBottom:'1rem',
                  background: c.highlight ? 'var(--green)' : 'var(--white)',
                  border:`1.5px solid ${c.highlight?'var(--green)':'var(--cream-border)'}`,
                  borderRadius:'var(--r)',textDecoration:'none',
                  transition:'all .25s',
                }}
                onMouseOver={e=>{if(!c.highlight){e.currentTarget.style.borderColor='var(--green)';e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='var(--shadow)'}}}
                onMouseOut={e=>{if(!c.highlight){e.currentTarget.style.borderColor='var(--cream-border)';e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow='none'}}}
              >
                <span style={{flexShrink:0,width:42,height:42,borderRadius:'var(--r-s)',display:'grid',placeItems:'center',background:'var(--green-pale)',color:'var(--green)'}}><Ico n={c.ic} size={20} /></span>
                <div className="c-body">
                  <div style={{fontWeight:700,fontSize:'.9rem',color:c.highlight?'#fff':'var(--black)',marginBottom:'.2rem'}}>{c.title}</div>
                  <div style={{fontSize:'.82rem',color:c.highlight?'rgba(255,255,255,.75)':'var(--muted)'}}>{c.sub}</div>
                </div>
                <div className="c-act" style={{fontSize:'.78rem',fontWeight:600,color:c.highlight?'#fff':'var(--green)'}}>
                  {c.action} →
                </div>
              </a>
            ))}

            {/* Horaires */}
            <div style={{marginTop:'2rem',padding:'1.5rem',background:'var(--cream)',border:'1.5px solid var(--cream-border)',borderRadius:'var(--r)'}}>
              <div style={{fontFamily:'var(--display)',fontWeight:700,fontSize:'1.05rem',letterSpacing:'-.01em',marginBottom:'1rem',display:'flex',alignItems:'center',gap:'.5rem'}}><Ico n="clock" /> Horaires</div>
              {[
                ['Dimanche – Jeudi', '8h00 – 18h00'],
                ['Vendredi', '8h00 – 12h00'],
                ['Samedi', 'Sur RDV'],
              ].map(([j,h])=>(
                <div key={j} style={{display:'flex',justifyContent:'space-between',fontSize:'.85rem',marginBottom:'.6rem'}}>
                  <span style={{color:'var(--muted)'}}>{j}</span>
                  <span style={{fontWeight:600}}>{h}</span>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT — FAQ */}
          <div>
            <h2 style={{fontFamily:'var(--display)',fontSize:'1.4rem',marginBottom:'2rem'}}>Questions fréquentes</h2>
            <div style={{display:'flex',flexDirection:'column',gap:'.8rem'}}>
              {FAQ.map((f,i) => (
                <details key={i} style={{
                  background:'var(--white)',border:'1.5px solid var(--cream-border)',
                  borderRadius:'var(--r)',overflow:'hidden',
                }}>
                  <summary style={{
                    padding:'1.1rem 1.3rem',cursor:'pointer',fontWeight:700,
                    fontSize:'.88rem',listStyle:'none',display:'flex',
                    justifyContent:'space-between',alignItems:'center',
                    userSelect:'none',
                  }}>
                    {f.q}
                    <span style={{color:'var(--green)',fontSize:'1.2rem',flexShrink:0,marginLeft:'1rem'}}>+</span>
                  </summary>
                  <div style={{padding:'0 1.3rem 1.1rem',fontSize:'.85rem',color:'var(--muted)',lineHeight:1.8}}>
                    {f.r}
                  </div>
                </details>
              ))}
            </div>

            {/* CTA dévis */}
            <div style={{
              marginTop:'2rem',
              background:'var(--green)',borderRadius:'var(--r)',
              padding:'2rem',textAlign:'center',position:'relative',overflow:'hidden',
            }}>
              <div style={{position:'absolute',inset:0,fontFamily:'var(--display)',fontSize:'5rem',color:'rgba(255,255,255,.05)',display:'flex',alignItems:'center',justifyContent:'center',pointerEvents:'none',letterSpacing:'.05em'}}>
                DEVIS
              </div>
              <div style={{position:'relative',zIndex:1}}>
                <div style={{fontFamily:'var(--display)',fontSize:'1.4rem',color:'#fff',marginBottom:'.5rem'}}>
                  Devis gratuit sous 24h
                </div>
                <p style={{fontSize:'.85rem',color:'rgba(255,255,255,.75)',marginBottom:'1.5rem'}}>
                  Décrivez votre besoin sur WhatsApp et recevez un devis personnalisé rapidement.
                </p>
                <a href={`https://wa.me/${WA}?text=Bonjour, je souhaite un devis pour mes uniformes.`}
                  target="_blank" rel="noopener noreferrer"
                  style={{
                    display:'inline-flex',alignItems:'center',gap:'.5rem',
                    background:'var(--gold-l)',color:'var(--green-d)',
                    padding:'1rem 1.9rem',fontWeight:700,fontSize:'.95rem',
                    borderRadius:'var(--r-s)',textDecoration:'none',
                  }}>
                  Demander un devis
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
