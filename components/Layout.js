import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import Backdrop from './Backdrop'
import PromoBar from './PromoBar'
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

const WaIcon = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.13h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.22 8.22 0 0 1-1.26-4.36c0-4.54 3.7-8.23 8.25-8.23a8.2 8.2 0 0 1 8.24 8.24c0 4.54-3.7 8.21-8.24 8.21Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.15.16-.29.18-.54.06-.25-.13-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.44.13-.15.17-.25.25-.42.09-.16.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.42-.14 0-.31-.02-.47-.02-.17 0-.43.06-.66.31-.22.25-.87.85-.87 2.07s.89 2.4 1.02 2.56c.12.17 1.75 2.67 4.24 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.47-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.1-.23-.16-.48-.29Z"/>
  </svg>
)

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

  // Scroll reveals for the whole site. Living here rather than in each page
  // means every route gets them, and re-running on navigation picks up the
  // elements the next page just mounted. Elements already revealed are
  // skipped so nothing re-animates on the way back.
  useEffect(() => {
    const targets = document.querySelectorAll('.rv:not(.in)')
    if (!targets.length) return
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('in'); obs.unobserve(e.target) }
      }),
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    )
    targets.forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [router.asPath])

  const isActive = (path) => router.pathname === path

  return (
    <div className="app-shell">
      <Backdrop />

      <PromoBar />

      {/* HEADER */}
      <header className={`hdr${scrolled ? ' scrolled' : ''}`}>
        <Link href="/" className="hdr-brand" style={{display:'flex',alignItems:'center',gap:'.55rem',textDecoration:'none',minWidth:0}}>
          <img src="/djimmy-logo-96.png" alt="Djimmy Prints"
               style={{width:36,height:36,objectFit:'cover',borderRadius:'50%',border:'1px solid var(--line)'}} />
          <span style={{fontFamily:'var(--display)',fontWeight:700,fontSize:'1.05rem',letterSpacing:'.01em',color:'var(--txt)',textTransform:'uppercase'}}>
            Djimmy&nbsp;<span style={{color:'var(--green)'}}>Prints</span>
          </span>
        </Link>

        {/* Devis has its own tab now, so this slot goes to the channel the
            business actually runs on. */}
        <a href={`https://wa.me/${WA}?text=${encodeURIComponent('Bonjour Djimmy Prints, je souhaite un devis.')}`}
          target="_blank" rel="noopener noreferrer"
          aria-label="Nous écrire sur WhatsApp"
          style={{
            display:'inline-flex', alignItems:'center', gap:'.45rem',
            background:'var(--green)', color:'#fff', textDecoration:'none',
            padding:'.55rem 1rem', borderRadius:'var(--r-s)',
            fontSize:'.85rem', fontWeight:600, flexShrink:0,
          }}
          className="hdr-wa">
          <WaIcon /> <span>WhatsApp</span>
        </a>
      </header>

      {/* PAGE CONTENT */}
      <main style={{position:'relative',zIndex:1}}>
        {children}
      </main>

      {/* FOOTER */}
      {/* Deep green closes the page. On an ivory ground a white footer just
          runs on; the dark band tells the eye the document has ended, and it
          is where the brand colour can be used at full strength. */}
      <footer style={{
        background: 'var(--green-d)',
        color: 'var(--paper)',
        padding: '3rem 1.15rem 1.5rem',
        position: 'relative',
        zIndex: 1,
      }}>
        <div className="foot-grid">
          <div>
            <div style={{display:'flex',alignItems:'center',gap:'.6rem',marginBottom:'.9rem'}}>
              <img src="/djimmy-logo-96.png" alt="Djimmy Prints"
                   style={{width:34,height:34,objectFit:'cover',borderRadius:'50%',border:'1px solid rgba(245,240,232,.25)'}} />
              <span style={{fontFamily:'var(--display)',fontWeight:700,fontSize:'1.05rem',letterSpacing:'.01em',textTransform:'uppercase',color:'#fff'}}>
                Djimmy <span style={{color:'var(--gold-l)'}}>Prints</span>
              </span>
            </div>
            <p style={{fontSize:'.92rem',color:'rgba(245,240,232,.72)',lineHeight:1.7}}>
              Uniformes et tenues de travail personnalisés pour entreprises.
              Broderie, sérigraphie, transfert numérique. Livraison dans les
              58 wilayas.
            </p>
          </div>

          <div>
            <p style={{fontSize:'.72rem',fontWeight:700,letterSpacing:'.16em',textTransform:'uppercase',color:'var(--gold-l)',marginBottom:'.9rem'}}>Navigation</p>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'.1rem .8rem'}}>
              {[['Accueil','/'],['Catalogue','/catalogue'],['Commander','/commande'],['Devis gratuit','/devis'],['Suivre ma commande','/suivi'],['Contact','/contact']].map(([label,href]) => (
                <Link key={href} href={href} style={{fontSize:'.92rem',color:'rgba(245,240,232,.78)',textDecoration:'none',padding:'.35rem 0',display:'block'}}>
                  {label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <p style={{fontSize:'.72rem',fontWeight:700,letterSpacing:'.16em',textTransform:'uppercase',color:'var(--gold-l)',marginBottom:'.9rem'}}>Contact</p>
            {/* Labelled rows rather than emoji: an address, a line and an
                inbox are business facts, and the pictograms read as decoration
                next to them. */}
            {[['Adresse', ADDRESS], ['Téléphone', PHONE_DISPLAY], ['E-mail', EMAIL]].map(([k, v]) => (
              <p key={k} style={{fontSize:'.92rem',color:'rgba(245,240,232,.78)',marginBottom:'.55rem',overflowWrap:'anywhere'}}>
                <span style={{display:'block',fontSize:'.7rem',letterSpacing:'.12em',textTransform:'uppercase',color:'rgba(245,240,232,.45)'}}>{k}</span>
                {v}
              </p>
            ))}
            <a href={`https://wa.me/${WA}`} target="_blank" rel="noopener noreferrer"
               style={{display:'inline-flex',alignItems:'center',gap:'.45rem',marginTop:'.5rem',background:'var(--gold-l)',color:'var(--green-d)',padding:'.65rem 1.2rem',borderRadius:'var(--r-s)',fontSize:'.88rem',fontWeight:700,textDecoration:'none'}}>
              <WaIcon size={16} /> WhatsApp
            </a>
          </div>
        </div>

        <div style={{borderTop:'1px solid rgba(245,240,232,.16)',paddingTop:'1.2rem',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'.5rem'}}>
          <span style={{fontSize:'.78rem',color:'rgba(245,240,232,.5)'}}>© {new Date().getFullYear()} Djimmy Prints</span>
          <span style={{fontSize:'.78rem',color:'rgba(245,240,232,.5)'}}>{SITE_URL}</span>
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
