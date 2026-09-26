import Head from 'next/head'
import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { WA } from '../lib/constants'

const WA_MSG = encodeURIComponent('Bonjour Djimmy Prints, je souhaite un devis pour des uniformes.')

// Line icons rather than emoji. A coloured emoji is the fastest way to make
// a supplier page read as a consumer app, and these six sit at the top of the
// section a buyer reads first.
const ICONS = {
  broderie:   'M4 20c4-1 6-3 8-7s4-6 8-7M8 16l-2 4 4-2M15 4l5 5',
  serigraphie:'M4 5h16v9H4zM7 14v6M17 14v6M4 9h16',
  transfert:  'M12 3v11m0 0 4-4m-4 4-4-4M4 17v3h16v-3',
  sublimation:'M12 3c3 3.5 5 6 5 8.5A5 5 0 0 1 7 11.5C7 9 9 6.5 12 3Z',
  flocage:    'M5 7h14M9 7v13M4 4h16',
  livraison:  'M3 7h11v9H3zM14 10h4l3 3v3h-7zM7 19a1.6 1.6 0 1 0 0-3.2A1.6 1.6 0 0 0 7 19Zm10 0a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2Z',
}

const SERVICES = [
  { ic: ICONS.broderie,    name: 'Broderie', desc: 'Fil cousu dans la matière. Tenue durable au lavage industriel, sur col, poitrine ou manche.' },
  { ic: ICONS.serigraphie, name: 'Sérigraphie', desc: 'Le meilleur coût unitaire au-delà de 100 pièces, sur aplats et grandes surfaces.' },
  { ic: ICONS.transfert,   name: 'Transfert numérique', desc: 'Logos en dégradé ou multicolores reproduits à l\'identique, sans surcoût par couleur.' },
  { ic: ICONS.sublimation, name: 'Sublimation', desc: 'Encre intégrée à la fibre sur polyester : le marquage ne craquelle pas et ne se décolle pas.' },
  { ic: ICONS.flocage,     name: 'Flocage', desc: 'Lettrage velours ou flex, pour les numéros, noms de poste et mentions de service.' },
  { ic: ICONS.livraison,   name: 'Livraison nationale', desc: 'Domicile ou stop desk dans les 58 wilayas, avec bon de livraison détaillé.' },
]

const WHY = [
  { n: '48H', t: 'Mise en production', d: 'Délai entre la validation de la maquette et le lancement en atelier.' },
  { n: '58', t: 'Wilayas desservies', d: 'Couverture nationale, à domicile ou en point de retrait.' },
  { n: '20', t: 'Pièces minimum', d: 'Seuil de commande accessible aux structures de toute taille.' },
  { n: '15%', t: 'Remise maximale', d: 'Dégressif automatique appliqué dès 50 pièces, jusqu\'à 15% au-delà de 200.' },
]

const PROCESS = [
  { n: '01', t: 'Devis chiffré', d: 'Vous précisez produits, quantités et technique de marquage. Vous recevez un chiffrage détaillé sous 24h ouvrables.', href: '/devis', cta: 'Demander un devis' },
  { n: '02', t: 'Validation de la maquette', d: 'Votre logo est positionné sur le vêtement et soumis à votre accord. Rien ne part en production avant validation écrite.', href: '/catalogue', cta: 'Ouvrir le configurateur' },
  { n: '03', t: 'Production et livraison', d: 'Votre référence de commande donne l\'étape en cours, de l\'atelier jusqu\'à la réception.', href: '/suivi', cta: 'Suivre une commande' },
]

const TESTIMONIALS = [
  { text: "Qualité impeccable et livraison rapide. Nos employés sont fiers de porter les uniformes Djimmy Prints.", author: "Karim B.", role: "Gérant restaurant, Alger" },
  { text: "Le configurateur en ligne est génial — on a pu visualiser nos logos avant de commander. Très professionnel.", author: "Soraya M.", role: "Directrice hôtel, Oran" },
  { text: "Prix compétitifs, excellent suivi. On renouvelle nos commandes chaque saison sans hésiter.", author: "Yazid T.", role: "DRH PME industrielle, Annaba" },
]

const Ic = ({ d }) => (
  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--green)"
       strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
)

export default function Home() {
  const rvRefs = useRef([])

  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('in') }),
      { threshold: 0.15 }
    )
    rvRefs.current.forEach(el => el && obs.observe(el))
    return () => obs.disconnect()
  }, [])

  const rv = (i) => (el) => { rvRefs.current[i] = el }

  return (
    <>
      <Head>
        <title>Djimmy Prints — Uniformes Personnalisés Alger | Broderie Algérie</title>
        <meta name="description" content="Djimmy Prints — Impression professionnelle sur uniformes et tenues de travail à Alger. Broderie, sérigraphie, transfert numérique. Devis gratuit sous 24h." />
        <meta property="og:title" content="Djimmy Prints — Uniformes d'entreprise personnalisés | Alger" />
        <meta property="og:description" content="Broderie, sérigraphie et transfert numérique sur uniformes et tenues de travail. À partir de 20 pièces, livré dans les 58 wilayas." />
      </Head>

      {/* ── HERO ── */}
      <section style={{
        minHeight: 'calc(100vh - 190px)', /* clears promo + header + tab bar */
        display: 'flex',
        alignItems: 'center',
        padding: '1.6rem 1.15rem 2.5rem',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{maxWidth: 860, position: 'relative', zIndex: 1}}>
          {/* Eyebrow : ce que fait l'entreprise, et où. Pas un slogan. */}
          <div style={{
            display: 'inline-block',
            borderLeft: '3px solid var(--gold)',
            paddingLeft: '.8rem',
            fontSize: '.78rem', fontWeight: 600, letterSpacing: '.16em',
            textTransform: 'uppercase', color: 'var(--green)', marginBottom: '1.8rem',
            lineHeight: 1.6,
          }}>
            Uniformes &amp; tenues de travail<br/>Aïn Bénian, Alger
          </div>

          {/* H1 — l'offre, énoncée. « Fait pour ceux qui rêvent grand »
              s'adressait à une personne qui se projette ; un acheteur
              professionnel cherche d'abord à savoir ce qu'on fabrique. */}
          <h1 style={{
            fontFamily: 'var(--display)', fontWeight: 700,
            fontSize: 'clamp(2.5rem, 11vw, 3.4rem)',
            lineHeight: 1.06,
            letterSpacing: '-.035em', marginBottom: '1.5rem', color: 'var(--txt)',
          }}>
            Uniformes d'entreprise,<br/>
            <span style={{color: 'var(--green)'}}>personnalisés à votre image.</span>
          </h1>

          <p style={{
            fontSize: '1.12rem', color: 'var(--muted)',
            lineHeight: 1.7, maxWidth: 480, marginBottom: '2.4rem',
          }}>
            Broderie, sérigraphie et transfert numérique sur polos, t-shirts,
            gilets et combinaisons. À partir de{' '}
            <strong style={{color:'var(--black)',fontWeight:600}}>20 pièces</strong>,
            livré dans les{' '}
            <strong style={{color:'var(--black)',fontWeight:600}}>58 wilayas</strong>.
          </p>

          {/* Le devis passe devant : un acheteur professionnel veut un
              chiffrage avant de commander. */}
          <div style={{display:'flex',gap:'.8rem',flexWrap:'wrap',marginBottom:'3.4rem'}}>
            <Link href="/devis" className="btn-g">
              Demander un devis
            </Link>
            <Link href="/catalogue" className="btn-outline">
              Voir le catalogue
            </Link>
          </div>

          {/* Stats */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '1.6rem 1.2rem', paddingTop: '2rem',
            borderTop: '1px solid var(--cream-border)',
          }}>
            {[['500+','Entreprises équipées'],['48H','Mise en production'],['58','Wilayas desservies'],['5','Techniques de marquage']].map(([n,l]) => (
              <div key={l}>
                <div style={{fontFamily:'var(--display)',fontSize:'2.4rem',fontWeight:700,letterSpacing:'-.03em',color:'var(--green)',lineHeight:1}}>{n}</div>
                <div style={{fontSize:'.78rem',color:'var(--muted)',letterSpacing:'.04em',marginTop:'.35rem',fontWeight:500}}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MARQUEE ── */}
      <div className="mqw">
        <div className="mqt">
          {[...Array(2)].map((_, i) => (
            ['Broderie','Sérigraphie','Transfert Numérique','Sublimation','Flocage','Livraison Nationale','Devis 24H'].map((item) => (
              <span key={`${i}-${item}`} className="mqi">
                {item}<span className="mqd"/>
              </span>
            ))
          ))}
        </div>
      </div>

      {/* ── SERVICES ── */}
      <section ref={rv(0)} className="rv" style={{padding:'3.2rem 1.15rem',background:'var(--surface)',borderTop:'1px solid var(--line)',borderBottom:'1px solid var(--line)',position:'relative',zIndex:1}}>
        <p className="s-lbl">Techniques de marquage</p>
        <h2 className="s-ttl">Cinq façons d'appliquer <span className="kw">votre logo</span></h2>
        <p className="s-desc">Le choix dépend du support, de la quantité et du rendu attendu. On vous oriente au moment du devis.</p>
        <div className="cards" style={{marginTop:'3rem'}}>
          {SERVICES.map((s, i) => (
            <div key={s.name} ref={rv(10 + i)} className="rv" style={{
              background: 'var(--paper)', border: '1px solid var(--line)',
              padding: '1.6rem 1.4rem', borderRadius: 'var(--r)',
              transition: 'border-color .25s', cursor: 'default',
              transitionDelay: `${i * 0.06}s`,
            }}
              onMouseOver={e => { e.currentTarget.style.borderColor='var(--green)' }}
              onMouseOut={e => { e.currentTarget.style.borderColor='var(--line)' }}
            >
              <span style={{display:'block',marginBottom:'1rem'}}><Ic d={s.ic} /></span>
              <div style={{fontFamily:'var(--display)',fontWeight:700,fontSize:'1.2rem',letterSpacing:'-.01em',marginBottom:'.5rem'}}>{s.name}</div>
              <p style={{fontSize:'.95rem',color:'var(--muted)',lineHeight:1.65}}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── WHY US ── */}
      <section ref={rv(1)} className="rv" style={{padding:'3.2rem 1.15rem',position:'relative',zIndex:1}}>
        <p className="s-lbl">Nos engagements</p>
        <h2 className="s-ttl">Ce sur quoi vous pouvez <span className="kw">compter</span></h2>
        <div className="cards-sm" style={{marginTop:'3rem'}}>
          {WHY.map((w, i) => (
            <div key={w.n} ref={rv(20 + i)} className="rv" style={{
              padding:'1.4rem 1.2rem', border:'1px solid var(--line)',
              borderTop:'3px solid var(--green)',
              borderRadius:'var(--r)', background:'var(--surface)',
              transitionDelay:`${i*0.06}s`,
            }}>
              <div style={{fontFamily:'var(--display)',fontSize:'2.3rem',fontWeight:700,letterSpacing:'-.03em',color:'var(--green)',lineHeight:1}}>{w.n}</div>
              <div style={{fontWeight:700,fontSize:'.98rem',margin:'.45rem 0 .3rem',color:'var(--black)'}}>{w.t}</div>
              <p style={{fontSize:'.88rem',color:'var(--muted)',lineHeight:1.6}}>{w.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── PROCESS ── */}
      <section ref={rv(4)} className="rv" style={{padding:'3.2rem 1.15rem',background:'var(--surface)',borderTop:'1px solid var(--line)',borderBottom:'1px solid var(--line)',position:'relative',zIndex:1}}>
        <p className="s-lbl">Déroulé d'une commande</p>
        <h2 className="s-ttl">Du devis à la <span className="kw">livraison</span></h2>
        <p className="s-desc">Trois étapes, chacune validée par vous avant de passer à la suivante.</p>
        <div className="cards" style={{marginTop:'3rem'}}>
          {PROCESS.map((s2, i) => (
            <div key={s2.n} ref={rv(40 + i)} className="rv" style={{
              background:'var(--paper)', border:'1px solid var(--line)',
              borderRadius:'var(--r)', padding:'1.6rem 1.4rem',
              display:'flex', flexDirection:'column', transitionDelay:`${i * 0.06}s`,
            }}>
              <div style={{display:'flex',alignItems:'center',gap:'.7rem',marginBottom:'.9rem'}}>
                <span style={{fontFamily:'var(--display)',fontSize:'.95rem',fontWeight:700,color:'#fff',background:'var(--green)',width:32,height:32,borderRadius:'var(--r-s)',display:'grid',placeItems:'center'}}>{s2.n}</span>
                <span style={{flex:1,height:1,background:'var(--line)'}} />
              </div>
              <div style={{fontFamily:'var(--display)',fontWeight:700,fontSize:'1.2rem',letterSpacing:'-.01em',marginBottom:'.5rem'}}>{s2.t}</div>
              <p style={{fontSize:'.95rem',color:'var(--muted)',lineHeight:1.65,marginBottom:'1.3rem',flex:1}}>{s2.d}</p>
              <Link href={s2.href} style={{
                fontSize:'.85rem', fontWeight:700, letterSpacing:'.05em',
                color:'var(--green)', textDecoration:'none',
              }}>
                {s2.cta} →
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA BAND ── */}
      <section ref={rv(2)} className="rv" style={{
        background:'var(--green-d)', padding:'2.8rem 1.15rem',
        display:'flex', alignItems:'center', justifyContent:'space-between',
        gap:'2rem', flexWrap:'wrap', position:'relative', overflow:'hidden', zIndex:1,
      }}>
        <div>
          <div style={{fontFamily:'var(--display)',fontWeight:700,fontSize:'clamp(1.75rem,7vw,2.3rem)',letterSpacing:'-.03em',color:'#fff',lineHeight:1.1}}>
            Un besoin en uniformes ?
          </div>
          <p style={{fontSize:'1rem',color:'rgba(245,240,232,.75)',marginTop:'.6rem',lineHeight:1.6}}>
            Devis gratuit, chiffré sous 24h ouvrables. Sans engagement.
          </p>
        </div>
        <div style={{display:'flex',gap:'1rem',flexWrap:'wrap',position:'relative',zIndex:1}}>
          <Link href="/devis" style={{
            background:'var(--gold-l)',color:'var(--green-d)',
            padding:'1rem 1.9rem',fontWeight:700,fontSize:'.95rem',
            border:'none',borderRadius:'var(--r-s)',cursor:'pointer',fontFamily:'inherit',
            textDecoration:'none',display:'inline-block',
          }}>
            Demander un devis
          </Link>
          <a href={`https://wa.me/${WA}?text=${WA_MSG}`} target="_blank" rel="noopener noreferrer"
            style={{
              background:'transparent',color:'#fff',
              padding:'1rem 1.9rem',fontWeight:600,fontSize:'.95rem',
              border:'1.5px solid rgba(245,240,232,.45)',
              borderRadius:'var(--r-s)',cursor:'pointer',fontFamily:'inherit',
              textDecoration:'none',display:'inline-block',
            }}>
            Écrire sur WhatsApp
          </a>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section ref={rv(3)} className="rv" style={{padding:'3.2rem 1.15rem',position:'relative',zIndex:1}}>
        <p className="s-lbl">Références</p>
        <h2 className="s-ttl">Ils nous font <span className="kw">confiance</span></h2>
        <div className="cards" style={{marginTop:'3rem'}}>
          {TESTIMONIALS.map((t, i) => (
            <div key={i} ref={rv(30+i)} className="rv" style={{
              background:'var(--surface)',border:'1px solid var(--line)',
              borderRadius:'var(--r)',padding:'1.6rem 1.4rem',
              transitionDelay:`${i*0.08}s`,
            }}>
              <div style={{color:'var(--gold)',fontSize:'.95rem',letterSpacing:'.15em',marginBottom:'1rem'}}>★★★★★</div>
              <p style={{fontSize:'1rem',color:'var(--black-soft)',lineHeight:1.7,marginBottom:'1.3rem'}}>«&nbsp;{t.text}&nbsp;»</p>
              <div style={{display:'flex',alignItems:'center',gap:'.8rem',paddingTop:'1rem',borderTop:'1px solid var(--line)'}}>
                <div style={{width:38,height:38,background:'var(--green-pale)',color:'var(--green)',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:'.95rem',flexShrink:0}}>
                  {t.author[0]}
                </div>
                <div>
                  <div style={{fontWeight:700,fontSize:'.92rem'}}>{t.author}</div>
                  <div style={{fontSize:'.82rem',color:'var(--muted)'}}>{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

    </>
  )
}
