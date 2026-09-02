import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import Aurora from './Aurora'
import { WA, PHONE_DISPLAY, EMAIL, ADDRESS, SITE_URL } from '../lib/constants'

// Line icons rather than emoji: the tab bar is chrome, and coloured emoji
// fight the gradient fill on the active tile.
const I = {
  home: 'M3 10.5 12 3l9 7.5M5.5 9.5V20h13V9.5',
  cat:  'M4 5h7v7H4zM13 5h7v7h-7zM4 14h7v6H4zM13 14h7v6h-7z',
  cmd:  'M4 6h2l2.2 9.5A2 2 0 0 0 10.2 17h7.4a2 2 0 0 0 2-1.6L21 8H7M10 21h.01M17 21h.01',
  suivi:'M3 8.5 12 4l9 4.5v7L12 20l-9-4.5zM3 8.5 12 13l9-4.5M12 13v7',
  ctc:  'M4 5h16v11H8l-4 4z',
  devis:'M6 3h8l4 4v14H6zM14 3v4h4M9 12h6M9 16h4',
}

const TABS = [
  { label: 'Accueil',   href: '/',          d: I.home },
  { label: 'Catalogue', href: '/catalogue', d: I.cat },
  { label: 'Commande',  href: '/commande',  d: I.cmd },
  { label: 'Suivi',     href: '/suivi',     d: I.suivi },
  { label: 'Contact',   href: '/contact',   d: I.ctc },
  { label: 'Devis',     href: '/devis',     d: I.devis },
]

const Icon = ({ d }) => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
)

export default function Layout({ children }) {
  const [scrolled, setScrolled] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const isActive = (path) => router.pathname === path

  return (
    <div className="app-shell">
      <Aurora />

      {/* PROMO STRIP */}
      <div className="promo-strip" onClick={() => router.push('/commande')}>
        🎁 50 pièces ou plus — remise volume automatique
      </div>

      {/* HEADER */}
      <header className={`hdr${scrolled ? ' scrolled' : ''}`}>
        <Link href="/" style={{display:'flex',alignItems:'center',gap:'.55rem',textDecoration:'none'}}>
          <img src="/djimmy-logo-96.png" alt="Djimmy Prints"
               style={{width:36,height:36,objectFit:'cover',borderRadius:'50%',border:'1px solid var(--line)'}} />
          <span style={{fontFamily:'var(--display)',fontWeight:700,fontSize:'.95rem',letterSpacing:'-.01em',color:'var(--txt)'}}>
            Djimmy&nbsp;<span style={{
              background:'var(--grad)', WebkitBackgroundClip:'text', backgroundClip:'text',
              WebkitTextFillColor:'transparent', color:'transparent',
            }}>Prints</span>
          </span>
        </Link>

        {/* Devis has its own tab now, so this slot goes to the channel the
            business actually runs on. */}
        <a href={`https://wa.me/${WA}?text=${encodeURIComponent('Bonjour Djimmy Prints, je souhaite un devis.')}`}
          target="_blank" rel="noopener noreferrer"
          aria-label="Nous écrire sur WhatsApp"
          style={{
            display:'inline-flex', alignItems:'center', gap:'.4rem',
            background:'#25D366', color:'#04120A', textDecoration:'none',
            padding:'.5rem .95rem', borderRadius:'100px',
            fontSize:'.75rem', fontWeight:700,
            boxShadow:'0 4px 14px rgba(37,211,102,.3)',
          }}>
          💬 WhatsApp
        </a>
      </header>

      {/* PAGE CONTENT */}
      <main style={{position:'relative',zIndex:1}}>
        {children}
      </main>

      {/* FOOTER */}
      <footer style={{
        background: 'var(--bg-2)',
        color: 'var(--txt)',
        padding: '2.5rem 1.15rem 1.5rem',
        position: 'relative',
        zIndex: 1,
        borderTop: '1px solid var(--line)',
      }}>
        <div className="foot-grid">
          <div>
            <div style={{display:'flex',alignItems:'center',gap:'.6rem',marginBottom:'.9rem'}}>
              <img src="/djimmy-logo-96.png" alt="Djimmy Prints"
                   style={{width:34,height:34,objectFit:'cover',borderRadius:'50%',border:'1px solid var(--line)'}} />
              <span style={{fontFamily:'var(--display)',fontWeight:700,fontSize:'.95rem'}}>
                Djimmy <span style={{color:'var(--vio)'}}>Prints</span>
              </span>
            </div>
            <p style={{fontSize:'.83rem',color:'var(--muted)',lineHeight:1.75}}>
              Impression professionnelle sur uniformes et tenues de travail.
              Broderie, sérigraphie, transfert numérique. Livraison partout en Algérie.
            </p>
          </div>

          <div>
            <p style={{fontSize:'.66rem',fontWeight:700,letterSpacing:'.14em',textTransform:'uppercase',color:'var(--muted-light)',marginBottom:'.8rem'}}>Navigation</p>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'.1rem .8rem'}}>
              {[['Accueil','/'],['Catalogue','/catalogue'],['Commander','/commande'],['Devis gratuit','/devis'],['Guide gratuit','/guide'],['Suivre ma commande','/suivi'],['Contact','/contact']].map(([label,href]) => (
                <Link key={href} href={href} style={{fontSize:'.83rem',color:'var(--muted)',textDecoration:'none',padding:'.3rem 0',display:'block'}}>
                  {label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <p style={{fontSize:'.66rem',fontWeight:700,letterSpacing:'.14em',textTransform:'uppercase',color:'var(--muted-light)',marginBottom:'.8rem'}}>Contact</p>
            <p style={{fontSize:'.83rem',color:'var(--muted)',marginBottom:'.45rem'}}>📍 {ADDRESS}</p>
            <p style={{fontSize:'.83rem',color:'var(--muted)',marginBottom:'.45rem'}}>📞 {PHONE_DISPLAY}</p>
            <p style={{fontSize:'.83rem',color:'var(--muted)',marginBottom:'.9rem',overflowWrap:'anywhere'}}>📧 {EMAIL}</p>
            <a href={`https://wa.me/${WA}`} target="_blank" rel="noopener noreferrer"
               style={{display:'inline-flex',alignItems:'center',gap:'.4rem',background:'#25D366',color:'#04120A',padding:'.6rem 1.1rem',borderRadius:'100px',fontSize:'.78rem',fontWeight:700,textDecoration:'none'}}>
              💬 WhatsApp
            </a>
          </div>
        </div>

        <div style={{borderTop:'1px solid var(--line)',paddingTop:'1.1rem',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'.5rem'}}>
          <span style={{fontSize:'.72rem',color:'var(--muted-light)'}}>© {new Date().getFullYear()} Djimmy Prints</span>
          <span style={{fontSize:'.72rem',color:'var(--muted-light)'}}>{SITE_URL}</span>
        </div>

        {/* Clears the fixed tab bar */}
        <div className="tab-spacer" />
      </footer>

      {/* BOTTOM TAB BAR */}
      <nav className="tabbar" aria-label="Navigation principale">
        {TABS.map(t => (
          <Link key={t.href} href={t.href} className={`tab${isActive(t.href) ? ' active' : ''}`}>
            <span className="tab-ic"><Icon d={t.d} /></span>
            {t.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
