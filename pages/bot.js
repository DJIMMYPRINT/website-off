import Head from 'next/head'
import { useState, useRef, useEffect } from 'react'
import { buildReply, INTENT_LIST, isOpen } from '../lib/autoreply'
import { WA } from '../lib/constants'

// Console de test du répondeur automatique.
//
// Elle appelle exactement la fonction que le webhook Meta utilise
// (lib/autoreply.js), côté navigateur : ce que vous lisez ici est mot pour
// mot ce qu'un client recevra sur Messenger, Instagram ou WhatsApp.
// Page interne : volontairement absente de la navigation et du sitemap, et
// marquée noindex.

const SUGGESTIONS = [
  'Bonjour',
  'chhal le polo ?',
  'vous avez des tabliers ?',
  'quel est le minimum de commande ?',
  'délai de livraison à Oran ?',
  'vous acceptez le CCP ?',
  'DP-K3M9QZ',
  'je veux parler à quelqu\'un',
]

const bubble = (mine) => ({
  maxWidth: '85%',
  alignSelf: mine ? 'flex-end' : 'flex-start',
  background: mine ? 'var(--grad)' : 'var(--surface-2)',
  color: 'var(--txt)',
  border: mine ? 'none' : '1px solid var(--line)',
  borderRadius: mine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
  padding: '.75rem 1rem',
  fontSize: '.88rem',
  lineHeight: 1.55,
  whiteSpace: 'pre-wrap',
  overflowWrap: 'anywhere',
})

// Le bot écrit en gras à la façon WhatsApp (*texte*) — on le rend ici pour
// que l'aperçu ressemble à ce que le client voit dans son application.
function renderWa(text) {
  return text.split(/(\*[^*\n]+\*)/g).map((part, i) =>
    part.startsWith('*') && part.endsWith('*') && part.length > 2
      ? <strong key={i}>{part.slice(1, -1)}</strong>
      : <span key={i}>{part}</span>
  )
}

export default function Bot() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [afterHours, setAfterHours] = useState(false)
  const endRef = useRef(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) }, [messages])

  const ask = (text) => {
    const q = String(text || '').trim()
    if (!q) return
    // Un vendredi 23h : de quoi vérifier le message de fermeture sans
    // attendre la nuit.
    const now = afterHours ? new Date('2026-09-04T22:00:00Z') : new Date()
    const reply = buildReply(q, { now, channel: 'test' })
    setMessages(m => [...m, { mine: true, text: q }, { mine: false, ...reply }])
    setInput('')
  }

  const openNow = isOpen(new Date())

  return (
    <>
      <Head>
        <title>Test du répondeur automatique — Djimmy Prints</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div style={{padding:'1.6rem 1.15rem 2.5rem',position:'relative',zIndex:1,maxWidth:760,margin:'0 auto'}}>
        <p className="s-lbl">Outil interne</p>
        <h1 className="s-ttl">Répondeur <span className="kw">automatique</span></h1>
        <p className="s-desc">
          Écrivez ce qu'un client pourrait envoyer sur Messenger, Instagram ou WhatsApp :
          vous verrez la réponse exacte que le bot enverrait, et l'intention qu'il a reconnue.
          Rien n'est envoyé à personne depuis cette page.
        </p>

        <div style={{display:'flex',gap:'.6rem',flexWrap:'wrap',alignItems:'center',margin:'1.2rem 0 1.6rem'}}>
          <span style={{
            fontSize:'.72rem',fontWeight:700,padding:'.3rem .7rem',borderRadius:'100px',
            border:'1px solid var(--line)',color: openNow ? 'var(--ok)' : 'var(--muted)',
          }}>
            {openNow ? '● Atelier ouvert' : '○ Atelier fermé'}
          </span>
          <label style={{fontSize:'.78rem',color:'var(--muted)',display:'flex',alignItems:'center',gap:'.4rem',cursor:'pointer'}}>
            <input type="checkbox" checked={afterHours} onChange={e => setAfterHours(e.target.checked)}
                   style={{width:'auto',accentColor:'var(--vio)'}} />
            Simuler une réception hors horaires
          </label>
        </div>

        {/* ── CONVERSATION ── */}
        <div className="glass" style={{padding:'1.1rem',minHeight:280,display:'flex',flexDirection:'column',gap:'.7rem'}}>
          {messages.length === 0 && (
            <p style={{color:'var(--muted)',fontSize:'.85rem',margin:'auto',textAlign:'center'}}>
              Aucun message pour l'instant.<br />Choisissez un exemple ci-dessous ou écrivez le vôtre.
            </p>
          )}
          {messages.map((m, i) => (
            <div key={i} style={{display:'flex',flexDirection:'column',alignItems:m.mine?'flex-end':'flex-start',gap:'.25rem'}}>
              <div style={bubble(m.mine)}>{m.mine ? m.text : renderWa(m.text)}</div>
              {!m.mine && (
                <span style={{fontSize:'.68rem',color:'var(--muted-light)',paddingLeft:'.2rem'}}>
                  intention : <strong style={{color:'var(--muted)'}}>{m.intent}</strong>
                  {m.handoff && ' · à reprendre par un humain'}
                </span>
              )}
            </div>
          ))}
          <div ref={endRef} />
        </div>

        {/* ── SAISIE ── */}
        <form onSubmit={e => { e.preventDefault(); ask(input) }}
              style={{display:'flex',gap:'.6rem',marginTop:'1rem',flexWrap:'wrap'}}>
          <input
            style={{flex:'1 1 240px',padding:'.75rem 1rem',border:'1.5px solid var(--line)',
                    borderRadius:'8px',fontSize:'.9rem',fontFamily:'inherit'}}
            placeholder="Message du client…"
            aria-label="Message du client"
            value={input}
            onChange={e => setInput(e.target.value)}
          />
          <button type="submit" className="btn-g">Tester</button>
          {messages.length > 0 && (
            <button type="button" className="btn-outline" onClick={() => setMessages([])}>Effacer</button>
          )}
        </form>

        <div style={{marginTop:'1rem'}}>
          {SUGGESTIONS.map(s => (
            <button key={s} type="button" onClick={() => ask(s)} style={{
              fontSize:'.75rem',padding:'.3rem .75rem',marginRight:'.4rem',marginTop:'.4rem',
              border:'1px solid var(--line)',background:'var(--surface)',color:'var(--txt-soft)',
              borderRadius:'100px',cursor:'pointer',fontFamily:'inherit',
            }}>{s}</button>
          ))}
        </div>

        {/* ── CE QUE LE BOT SAIT FAIRE ── */}
        <h2 style={{fontFamily:'var(--display)',fontSize:'1.1rem',margin:'2.5rem 0 .8rem'}}>
          Ce que le bot sait traiter
        </h2>
        <div className="cards-sm">
          {INTENT_LIST.map(i => (
            <div key={i.intent} style={{
              border:'1px solid var(--line)',borderRadius:'12px',padding:'.7rem .9rem',
              background:'var(--surface)',fontSize:'.8rem',
            }}>
              <strong>{i.label}</strong>
              <div style={{color:'var(--muted)',fontSize:'.72rem',marginTop:'.15rem'}}>{i.intent}</div>
            </div>
          ))}
        </div>
        <p style={{fontSize:'.8rem',color:'var(--muted)',marginTop:'1.2rem',lineHeight:1.6}}>
          Le reste — questions hors sujet, demandes de devis complexes, réclamations — est marqué
          « à reprendre par un humain » : le bot répond honnêtement qu'il transmet, sans inventer.
          Pour modifier les réponses ou ajouter un mot-clé, éditez <code>lib/autoreply.js</code>.
          Pour brancher le bot sur vos comptes, suivez <code>docs/AUTO-REPONSES.md</code>.
        </p>
        <p style={{fontSize:'.8rem',color:'var(--muted)',marginTop:'.6rem'}}>
          Numéro WhatsApp utilisé par le site : <strong>+{WA}</strong>
        </p>
      </div>
    </>
  )
}
