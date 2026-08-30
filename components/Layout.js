import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import Aurora from './Aurora'
import { WA, PHONE_DISPLAY, EMAIL, ADDRESS, SITE_URL } from '../lib/constants'

const NAV = [
  { label: 'Accueil', href: '/' },
  { label: 'Catalogue', href: '/catalogue' },
  { label: 'Commande', href: '/commande' },
  { label: 'Suivi', href: '/suivi' },
  { label: 'Contact', href: '/contact' },
]

export default function Layout({ children }) {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close the mobile panel on navigation, otherwise it stays open over the
  // page the visitor just tapped through to.
  useEffect(() => {
    const close = () => setMenuOpen(false)
    router.events.on('routeChangeComplete', close)
    return () => router.events.off('routeChangeComplete', close)
  }, [router.events])

  const isActive = (path) => router.pathname === path

  return (
    <>
      <Aurora />

      {/* PROMO STRIP */}
      <div className="promo-strip" onClick={() => router.push('/commande')}>
        🎁 Commandez 50 pièces ou plus — Remise volume automatique · Livraison partout en Algérie
      </div>

      {/* NAV */}
      <nav style={{
        position: 'fixed',
        top: 0, left: 0, right: 0,
        zIndex: 500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '.8rem 4vw',
        borderBottom: scrolled || menuOpen ? '1px solid var(--cream-border)' : '1px solid transparent',
        background: scrolled || menuOpen ? 'rgba(245,240,232,.96)' : 'transparent',
        backdropFilter: scrolled || menuOpen ? 'blur(18px)' : 'none',
        boxShadow: scrolled ? 'var(--shadow)' : 'none',
        transition: 'background .4s, border-color .4s, box-shadow .4s',
        marginTop: '36px',
      }}>
        {/* Brand */}
        <Link href="/" style={{display:'flex',alignItems:'center',gap:'.7rem',textDecoration:'none'}}>
          <img src="/djimmy-logo-96.png" alt="Djimmy Prints" style={{width:48,height:48,objectFit:'contain',borderRadius:'50%'}} />
          <span style={{fontFamily:'Anton',fontSize:'1.25rem',letterSpacing:'.03em',color:'var(--black)',textTransform:'uppercase'}}>
            DJIMMY <span style={{color:'var(--green)'}}>PRINTS</span>
          </span>
        </Link>

        {/* Desktop Links */}
        <ul className="nav-links">
          {NAV.map(({ label, href }) => (
            <li key={href}>
              <Link href={href} style={{
                color: isActive(href) ? 'var(--black)' : 'var(--muted)',
                textDecoration: 'none',
                fontSize: '.75rem',
                fontWeight: 500,
                letterSpacing: '.1em',
                textTransform: 'uppercase',
                padding: '.45rem 1.1rem',
                display: 'block',
                position: 'relative',
                borderBottom: isActive(href) ? '1.5px solid var(--green)' : 'none',
                transition: 'color .2s',
              }}>
                {label}
              </Link>
            </li>
          ))}
          <li>
            <Link
              href="/devis"
              style={{
                background: 'var(--green)',
                color: 'var(--white)',
                borderRadius: '2px',
                padding: '.45rem 1.3rem',
                fontSize: '.75rem',
                fontWeight: 600,
                letterSpacing: '.1em',
                textTransform: 'uppercase',
                textDecoration: 'none',
                marginLeft: '.5rem',
                transition: 'background .2s',
                display: 'inline-block',
              }}
              onMouseOver={e => e.currentTarget.style.background = 'var(--green-l)'}
              onMouseOut={e => e.currentTarget.style.background = 'var(--green)'}
            >
              Devis Gratuit
            </Link>
          </li>
        </ul>

        {/* Mobile burger */}
        <button
          className="nav-burger"
          aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(o => !o)}
        >
          {menuOpen ? '✕' : '☰'}
        </button>
      </nav>

      {/* Mobile panel */}
      {menuOpen && (
        <div className="mobile-panel" style={{top: 110}}>
          {NAV.map(({ label, href }) => (
            <Link key={href} href={href} onClick={() => setMenuOpen(false)}
              style={{color: isActive(href) ? 'var(--green)' : 'var(--black)', fontWeight: isActive(href) ? 700 : 500}}>
              {label}
            </Link>
          ))}
          <Link href="/devis" onClick={() => setMenuOpen(false)} className="btn-g" style={{marginTop:'.9rem',justifyContent:'center'}}>
            Devis gratuit
          </Link>
          <a href={`https://wa.me/${WA}`} target="_blank" rel="noopener noreferrer"
            style={{marginTop:'.6rem',background:'#25D366',color:'#fff',borderRadius:'3px',textAlign:'center',fontWeight:700,padding:'.85rem'}}>
            💬 WhatsApp — {PHONE_DISPLAY}
          </a>
        </div>
      )}

      {/* PAGE CONTENT */}
      <main style={{position:'relative',zIndex:1}}>
        {children}
      </main>

      {/* FOOTER */}
      <footer style={{
        background: 'var(--black)',
        color: 'var(--cream)',
        padding: '4rem 4vw 2rem',
        position: 'relative',
        zIndex: 1,
      }}>
        <div className="foot-grid">
          {/* Brand */}
          <div>
            <div style={{display:'flex',alignItems:'center',gap:'.7rem',marginBottom:'1rem'}}>
              <img src="/djimmy-logo-96.png" alt="Djimmy Prints" style={{width:44,height:44,objectFit:'contain',borderRadius:'50%'}} />
              <span style={{fontFamily:'Anton',fontSize:'1.1rem',letterSpacing:'.05em',textTransform:'uppercase'}}>
                DJIMMY <span style={{color:'var(--green-l)'}}>PRINTS</span>
              </span>
            </div>
            <p style={{fontSize:'.85rem',color:'rgba(245,240,232,.55)',lineHeight:1.8,maxWidth:280}}>
              Impression professionnelle sur uniformes et tenues de travail. Broderie, sérigraphie, transfert numérique. Livraison partout en Algérie.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <p style={{fontSize:'.72rem',fontWeight:700,letterSpacing:'.12em',textTransform:'uppercase',color:'rgba(245,240,232,.4)',marginBottom:'1rem'}}>Navigation</p>
            {[['Accueil','/'],['Catalogue','/catalogue'],['Commander','/commande'],['Devis gratuit','/devis'],['Suivre ma commande','/suivi'],['Contact','/contact']].map(([label,href]) => (
              <Link key={href} href={href} style={{display:'block',fontSize:'.85rem',color:'rgba(245,240,232,.6)',textDecoration:'none',marginBottom:'.5rem',transition:'color .2s'}}
                onMouseOver={e=>e.currentTarget.style.color='var(--cream)'}
                onMouseOut={e=>e.currentTarget.style.color='rgba(245,240,232,.6)'}>
                {label}
              </Link>
            ))}
          </div>

          {/* Services */}
          <div>
            <p style={{fontSize:'.72rem',fontWeight:700,letterSpacing:'.12em',textTransform:'uppercase',color:'rgba(245,240,232,.4)',marginBottom:'1rem'}}>Services</p>
            {['Broderie','Sérigraphie','Transfert numérique','Sublimation','Flocage'].map(s => (
              <p key={s} style={{fontSize:'.85rem',color:'rgba(245,240,232,.6)',marginBottom:'.5rem'}}>{s}</p>
            ))}
          </div>

          {/* Contact */}
          <div>
            <p style={{fontSize:'.72rem',fontWeight:700,letterSpacing:'.12em',textTransform:'uppercase',color:'rgba(245,240,232,.4)',marginBottom:'1rem'}}>Contact</p>
            <p style={{fontSize:'.85rem',color:'rgba(245,240,232,.6)',marginBottom:'.5rem'}}>📍 {ADDRESS}</p>
            <p style={{fontSize:'.85rem',color:'rgba(245,240,232,.6)',marginBottom:'.5rem'}}>📞 {PHONE_DISPLAY}</p>
            <p style={{fontSize:'.85rem',color:'rgba(245,240,232,.6)',marginBottom:'1rem'}}>📧 {EMAIL}</p>
            <a
              href={`https://wa.me/${WA}`}
              target="_blank" rel="noopener noreferrer"
              style={{display:'inline-flex',alignItems:'center',gap:'.4rem',background:'#25D366',color:'#fff',padding:'.5rem 1.1rem',borderRadius:'3px',fontSize:'.78rem',fontWeight:700,textDecoration:'none'}}
            >
              💬 WhatsApp
            </a>
          </div>
        </div>

        <div style={{borderTop:'1px solid rgba(245,240,232,.08)',paddingTop:'1.5rem',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'1rem'}}>
          <span style={{fontSize:'.75rem',color:'rgba(245,240,232,.3)'}}>© {new Date().getFullYear()} Djimmy Prints — {ADDRESS}</span>
          <span style={{fontSize:'.75rem',color:'rgba(245,240,232,.3)'}}>{SITE_URL}</span>
        </div>
      </footer>
    </>
  )
}
