import Head from 'next/head'
import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { WA } from '../lib/constants'

const WA_MSG = encodeURIComponent('Bonjour Djimmy Prints, je souhaite un devis pour des uniformes.')

const SERVICES = [
  { ic: '🪡', name: 'Broderie', desc: 'Rendu premium, idéal pour logos, textes et armoiries sur col, poitrine ou manche.' },
  { ic: '🖨️', name: 'Sérigraphie', desc: 'Impression haute résistance sur grandes surfaces. Parfaite pour commandes en volume.' },
  { ic: '💻', name: 'Transfert numérique', desc: 'Reproduction fidèle de votre logo avec couleurs exactes. Délai rapide.' },
  { ic: '🌈', name: 'Sublimation', desc: 'Couleurs vibrantes et durables sur polyester. Idéal pour sportswear.' },
  { ic: '🔤', name: 'Flocage', desc: 'Lettrage en velours ou flex pour un look sport authentique.' },
  { ic: '📦', name: 'Livraison Algérie', desc: 'Livraison à domicile ou stop desk dans les 58 wilayas.' },
]

const WHY = [
  { n: '48H', t: 'Délai de traitement', d: 'Confirmation et mise en production sous 48h ouvrables.' },
  { n: '58', t: 'Wilayas livrées', d: 'Couverture nationale complète, domicile ou stop desk.' },
  { n: '20+', t: 'Pièces minimum', d: 'Accessible aux petites et grandes structures.' },
  { n: '100%', t: 'Sur mesure', d: 'Vos couleurs, votre logo, votre identité.' },
]

const PROCESS = [
  { n: '01', t: 'Demandez un devis', d: 'Produits, quantité, technique : vous décrivez le besoin, on chiffre sous 24h ouvrables.', href: '/devis', cta: 'Demander un devis' },
  { n: '02', t: 'Validez la maquette', d: 'On place votre logo et on vous envoie un aperçu. Rien ne part en production sans votre feu vert.', href: '/catalogue', cta: 'Essayer le configurateur' },
  { n: '03', t: 'Suivez la production', d: 'Votre référence DP vous donne l\'étape en cours, de l\'atelier jusqu\'à la livraison.', href: '/suivi', cta: 'Suivre ma commande' },
]

const TESTIMONIALS = [
  { text: "Qualité impeccable et livraison rapide. Nos employés sont fiers de porter les uniformes Djimmy Prints.", author: "Karim B.", role: "Gérant restaurant, Alger" },
  { text: "Le configurateur en ligne est génial — on a pu visualiser nos logos avant de commander. Très professionnel.", author: "Soraya M.", role: "Directrice hôtel, Oran" },
  { text: "Prix compétitifs, excellent suivi. On renouvelle nos commandes chaque saison sans hésiter.", author: "Yazid T.", role: "DRH PME industrielle, Annaba" },
]

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
        <meta property="og:title" content="Djimmy Prints — Fait pour ceux qui rêvent grand" />
        <meta property="og:description" content="Broderie, sérigraphie, transfert numérique sur uniformes. Livraison partout en Algérie." />
      </Head>

      {/* ── HERO ── */}
      <section style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        padding: '9rem 4vw 5rem',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{maxWidth: 860, position: 'relative', zIndex: 1}}>
          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '.6rem',
            background: 'var(--green-pale)', border: '1px solid rgba(45,90,39,.2)',
            padding: '.4rem 1rem', borderRadius: '100px',
            fontSize: '.72rem', fontWeight: 600, letterSpacing: '.12em',
            textTransform: 'uppercase', color: 'var(--green)', marginBottom: '2rem',
          }}>
            <span style={{width:6,height:6,background:'var(--green)',borderRadius:'50%',animation:'blk 2s infinite'}} />
            Impression textile professionnelle · Alger
          </div>

          {/* H1 */}
          <h1 style={{
            fontFamily: 'Anton', fontWeight: 400,
            fontSize: 'clamp(2.8rem, 8vw, 6.2rem)',
            lineHeight: 1.03, textTransform: 'uppercase',
            letterSpacing: '.005em', marginBottom: '1.8rem', color: 'var(--black)',
          }}>
            Fait pour ceux<br/>
            <span style={{color: 'var(--green)'}}>qui rêvent grand.</span>
          </h1>

          <p style={{
            fontSize: '1.05rem', color: 'var(--muted)',
            lineHeight: 1.85, maxWidth: 500, marginBottom: '2.8rem',
          }}>
            Uniformes brodés, sérigraphiés, personnalisés à votre image.
            Livraison dans les <strong style={{color:'var(--black)'}}>58 wilayas</strong> d'Algérie.
            Devis gratuit en moins de 24h.
          </p>

          {/* CTAs */}
          <div style={{display:'flex',gap:'1rem',flexWrap:'wrap',marginBottom:'4rem'}}>
            <Link href="/commande" className="btn-g">
              Commander maintenant
            </Link>
            <Link href="/catalogue" className="btn-outline">
              Voir le catalogue
            </Link>
          </div>

          {/* Stats */}
          <div style={{
            display: 'flex', gap: '3rem', paddingTop: '2.2rem',
            borderTop: '1.5px solid var(--cream-border)', flexWrap: 'wrap',
          }}>
            {[['500+','Clients satisfaits'],['48H','Délai de traitement'],['58','Wilayas livrées'],['5+','Techniques d\'impression']].map(([n,l]) => (
              <div key={l}>
                <div style={{fontFamily:'Anton',fontSize:'2.6rem',fontWeight:400,color:'var(--green)',lineHeight:1}}>{n}</div>
                <div style={{fontSize:'.72rem',color:'var(--muted)',letterSpacing:'.07em',marginTop:'.3rem',fontWeight:500,textTransform:'uppercase'}}>{l}</div>
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
      <section ref={rv(0)} className="rv" style={{padding:'5.5rem 4vw',background:'rgba(255,255,255,.5)',backdropFilter:'blur(6px)',position:'relative',zIndex:1}}>
        <p className="s-lbl">Nos techniques</p>
        <h2 className="s-ttl">Ce qu'on fait <span className="kw">mieux que tout le monde</span></h2>
        <div className="cards" style={{marginTop:'3rem'}}>
          {SERVICES.map((s, i) => (
            <div key={s.name} ref={rv(10 + i)} className="rv" style={{
              background: 'var(--cream)', border: '1.5px solid var(--cream-border)',
              padding: '2.2rem 1.8rem', borderRadius: '6px',
              transition: 'all .3s', cursor: 'default',
              transitionDelay: `${i * 0.08}s`,
            }}
              onMouseOver={e => { e.currentTarget.style.borderColor='var(--green)'; e.currentTarget.style.boxShadow='var(--shadow-md)'; e.currentTarget.style.transform='translateY(-3px)'; }}
              onMouseOut={e => { e.currentTarget.style.borderColor='var(--cream-border)'; e.currentTarget.style.boxShadow='none'; e.currentTarget.style.transform='none'; }}
            >
              <span style={{fontSize:'1.8rem',marginBottom:'1.1rem',display:'block'}}>{s.ic}</span>
              <div style={{fontFamily:'Anton',fontSize:'1.15rem',textTransform:'uppercase',letterSpacing:'.02em',marginBottom:'.5rem'}}>{s.name}</div>
              <p style={{fontSize:'.85rem',color:'var(--muted)',lineHeight:1.7}}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── WHY US ── */}
      <section ref={rv(1)} className="rv" style={{padding:'5.5rem 4vw',position:'relative',zIndex:1}}>
        <p className="s-lbl">Pourquoi Djimmy Prints</p>
        <h2 className="s-ttl">Des chiffres qui <span className="kw">parlent d'eux-mêmes</span></h2>
        <div className="cards-sm" style={{marginTop:'3rem'}}>
          {WHY.map((w, i) => (
            <div key={w.n} ref={rv(20 + i)} className="rv" style={{
              padding:'1.8rem 1.5rem', border:'1.5px solid var(--cream-border)',
              borderRadius:'6px', background:'var(--white)', transition:'all .3s',
              transitionDelay:`${i*0.08}s`,
            }}
              onMouseOver={e=>{e.currentTarget.style.borderColor='var(--green)';e.currentTarget.style.transform='translateY(-3px)';e.currentTarget.style.boxShadow='var(--shadow)'}}
              onMouseOut={e=>{e.currentTarget.style.borderColor='var(--cream-border)';e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow='none'}}
            >
              <div style={{fontFamily:'Anton',fontSize:'2.6rem',fontWeight:400,color:'var(--green)',lineHeight:1}}>{w.n}</div>
              <div style={{fontWeight:700,fontSize:'.9rem',margin:'.4rem 0',color:'var(--black)'}}>{w.t}</div>
              <p style={{fontSize:'.8rem',color:'var(--muted)',lineHeight:1.7}}>{w.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── PROCESS ── */}
      <section ref={rv(4)} className="rv" style={{padding:'5.5rem 4vw',background:'rgba(255,255,255,.5)',backdropFilter:'blur(6px)',position:'relative',zIndex:1}}>
        <p className="s-lbl">Comment ça marche</p>
        <h2 className="s-ttl">De l'idée à la <span className="kw">livraison</span></h2>
        <p className="s-desc">Trois étapes, zéro surprise. Vous gardez la main à chaque validation.</p>
        <div className="cards" style={{marginTop:'3rem'}}>
          {PROCESS.map((s2, i) => (
            <div key={s2.n} ref={rv(40 + i)} className="rv" style={{
              background:'var(--cream)', border:'1.5px solid var(--cream-border)',
              borderRadius:'6px', padding:'2.2rem 1.8rem',
              display:'flex', flexDirection:'column', transitionDelay:`${i * 0.08}s`,
            }}>
              <div style={{fontFamily:'Anton',fontSize:'2.4rem',color:'var(--gold)',lineHeight:1,marginBottom:'.8rem'}}>{s2.n}</div>
              <div style={{fontFamily:'Anton',fontSize:'1.15rem',textTransform:'uppercase',letterSpacing:'.02em',marginBottom:'.5rem'}}>{s2.t}</div>
              <p style={{fontSize:'.85rem',color:'var(--muted)',lineHeight:1.7,marginBottom:'1.3rem',flex:1}}>{s2.d}</p>
              <Link href={s2.href} style={{
                fontSize:'.78rem', fontWeight:700, letterSpacing:'.06em', textTransform:'uppercase',
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
        background:'var(--green)', padding:'4rem 4vw',
        display:'flex', alignItems:'center', justifyContent:'space-between',
        gap:'2rem', flexWrap:'wrap', position:'relative', overflow:'hidden', zIndex:1,
      }}>
        <div style={{position:'absolute',right:'-1rem',top:'50%',transform:'translateY(-50%)',fontFamily:'Anton',fontSize:'7rem',fontWeight:400,color:'rgba(255,255,255,.07)',whiteSpace:'nowrap',pointerEvents:'none'}}>
          DJIMMY PRINTS
        </div>
        <div>
          <div style={{fontFamily:'Anton',fontWeight:400,fontSize:'clamp(1.6rem,3.5vw,2.5rem)',textTransform:'uppercase',color:'var(--cream)',lineHeight:1}}>
            Prêt à habiller votre équipe ?
          </div>
          <p style={{fontSize:'.88rem',color:'rgba(245,240,232,.75)',marginTop:'.4rem'}}>
            Devis gratuit · Réponse sous 24h · Livraison dans 58 wilayas
          </p>
        </div>
        <div style={{display:'flex',gap:'1rem',flexWrap:'wrap',position:'relative',zIndex:1}}>
          <Link href="/commande" style={{
            background:'var(--cream)',color:'var(--green)',
            padding:'.9rem 2.2rem',fontWeight:700,fontSize:'.85rem',
            letterSpacing:'.07em',textTransform:'uppercase',border:'none',
            borderRadius:'3px',cursor:'pointer',fontFamily:'Inter',
            transition:'all .2s',textDecoration:'none',display:'inline-block',
          }}>
            Commander
          </Link>
          <a href={`https://wa.me/${WA}?text=${WA_MSG}`} target="_blank" rel="noopener noreferrer"
            style={{
              background:'transparent',color:'var(--cream)',
              padding:'.9rem 2.2rem',fontWeight:600,fontSize:'.85rem',
              letterSpacing:'.07em',textTransform:'uppercase',
              border:'1.5px solid rgba(245,240,232,.4)',
              borderRadius:'3px',cursor:'pointer',fontFamily:'Inter',
              transition:'all .2s',textDecoration:'none',display:'inline-block',
            }}>
            💬 WhatsApp
          </a>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section ref={rv(3)} className="rv" style={{padding:'5.5rem 4vw',position:'relative',zIndex:1}}>
        <p className="s-lbl">Témoignages</p>
        <h2 className="s-ttl">Ils nous font <span className="kw">confiance</span></h2>
        <div className="cards" style={{marginTop:'3rem'}}>
          {TESTIMONIALS.map((t, i) => (
            <div key={i} ref={rv(30+i)} className="rv" style={{
              background:'var(--white)',border:'1.5px solid var(--cream-border)',
              borderRadius:'6px',padding:'2rem',transition:'all .3s',
              transitionDelay:`${i*0.1}s`,
            }}>
              <div style={{color:'var(--gold)',fontSize:'1.1rem',marginBottom:'1rem'}}>★★★★★</div>
              <p style={{fontSize:'.9rem',color:'var(--black-soft)',lineHeight:1.8,marginBottom:'1.2rem',fontStyle:'italic'}}>"{t.text}"</p>
              <div style={{display:'flex',alignItems:'center',gap:'.8rem'}}>
                <div style={{width:38,height:38,background:'var(--green)',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--white)',fontWeight:700,fontSize:'.9rem',flexShrink:0}}>
                  {t.author[0]}
                </div>
                <div>
                  <div style={{fontWeight:700,fontSize:'.85rem'}}>{t.author}</div>
                  <div style={{fontSize:'.75rem',color:'var(--muted)'}}>{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <style jsx>{`
        @keyframes blk { 0%,100%{opacity:1} 50%{opacity:.2} }
      `}</style>
    </>
  )
}
