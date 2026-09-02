import Head from 'next/head'
import { useState, useRef, useEffect } from 'react'
import { buildReply, INTENT_LIST, isOpen } from '../lib/autoreply'
import {
  ACCOUNTS, accountByKey, matchCampaign, publicReplyFor, dmFor, buildBrandReply, activeCampaigns,
} from '../lib/campaigns'

// Console de test des automatismes réseaux sociaux.
//
// Elle appelle exactement les fonctions que le webhook Meta utilise
// (lib/autoreply.js et lib/campaigns.js), côté navigateur : ce que vous lisez
// ici est mot pour mot ce qu'un abonné recevra.
// Page interne : volontairement absente de la navigation et du sitemap, et
// marquée noindex.

const DM_SUGGESTIONS = {
  djimmy: ['Bonjour', 'chhal le polo ?', 'vous avez des tabliers ?', 'délai de livraison à Oran ?',
    'vous acceptez le CCP ?', 'DP-K3M9QZ', 'je veux parler à quelqu\'un'],
  amouri: ['Salut', 'GUIDE', 'UNIFORME', 'tu peux m\'aider ?'],
}

const seg = (on) => ({
  fontSize: '.75rem', fontWeight: 700, padding: '.4rem .85rem', borderRadius: '100px',
  border: `1px solid ${on ? 'transparent' : 'var(--line)'}`,
  background: on ? 'var(--grad)' : 'var(--surface)',
  color: on ? '#fff' : 'var(--muted)',
  cursor: 'pointer', fontFamily: 'inherit',
})

const bubble = (kind) => ({
  maxWidth: '85%',
  alignSelf: kind === 'in' ? 'flex-end' : 'flex-start',
  background: kind === 'in' ? 'var(--grad)' : kind === 'public' ? 'var(--surface)' : 'var(--surface-2)',
  color: 'var(--txt)',
  border: kind === 'in' ? 'none' : '1px solid var(--line)',
  borderRadius: kind === 'in' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
  padding: '.75rem 1rem', fontSize: '.88rem', lineHeight: 1.55,
  whiteSpace: 'pre-wrap', overflowWrap: 'anywhere',
})

// Le bot écrit en gras à la façon WhatsApp (*texte*) — on le rend ici pour
// que l'aperçu ressemble à ce que l'abonné voit dans son application.
function renderWa(text) {
  return String(text).split(/(\*[^*\n]+\*)/g).map((part, i) =>
    part.startsWith('*') && part.endsWith('*') && part.length > 2
      ? <strong key={i}>{part.slice(1, -1)}</strong>
      : <span key={i}>{part}</span>
  )
}

export default function Bot() {
  const [account, setAccount] = useState('djimmy')
  const [mode, setMode] = useState('dm')
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [afterHours, setAfterHours] = useState(false)
  const endRef = useRef(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) }, [messages])
  useEffect(() => { setMessages([]) }, [account, mode])

  const acc = accountByKey(account)
  const campaigns = activeCampaigns(account)

  const ask = (text) => {
    const q = String(text || '').trim()
    if (!q) return
    const ctx = { name: 'Yacine', commentId: 'preview', accountKey: account }
    const out = [{ kind: 'in', text: q }]

    if (mode === 'comment') {
      const campaign = matchCampaign({ accountKey: account, text: q })
      if (!campaign) {
        out.push({ kind: 'none', text: 'Aucun mot-clé de campagne reconnu — le commentaire est laissé à un humain, rien n\'est envoyé.' })
      } else {
        const pub = publicReplyFor(campaign, ctx)
        if (pub) out.push({ kind: 'public', text: pub, tag: `💬 réponse publique · campagne ${campaign.id}` })
        out.push({ kind: 'dm', text: dmFor(campaign, ctx).join('\n\n'), tag: '📩 message privé' })
      }
    } else {
      // Un vendredi 23h : de quoi vérifier le message de fermeture sans
      // attendre la nuit.
      const now = afterHours ? new Date('2026-09-04T22:00:00Z') : new Date()
      const reply = acc.brain === 'brand'
        ? buildBrandReply(q, ctx)
        : buildReply(q, { now, channel: 'test' })
      const text = reply.campaign ? dmFor(reply.campaign, ctx).join('\n\n') : reply.text
      out.push({ kind: 'dm', text, tag: `intention : ${reply.intent}${reply.handoff ? ' · à reprendre par un humain' : ''}` })
    }

    setMessages(m => [...m, ...out])
    setInput('')
  }

  const suggestions = mode === 'comment'
    ? [...new Set(campaigns.flatMap(c => c.keywords))].concat('bravo 👏')
    : DM_SUGGESTIONS[account] || []

  return (
    <>
      <Head>
        <title>Test des automatismes réseaux sociaux — Djimmy Prints</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div style={{padding:'1.6rem 1.15rem 2.5rem',position:'relative',zIndex:1,maxWidth:760,margin:'0 auto'}}>
        <p className="s-lbl">Outil interne</p>
        <h1 className="s-ttl">Automatismes <span className="kw">réseaux sociaux</span></h1>
        <p className="s-desc">
          Testez les deux automatismes sans rien envoyer à personne : la réponse aux
          <strong> messages privés</strong>, et les campagnes <strong>« commente un mot → reçois le lien en DM »</strong>.
        </p>

        {/* ── COMPTE ── */}
        <div style={{display:'flex',gap:'.4rem',flexWrap:'wrap',marginTop:'1.4rem'}}>
          {ACCOUNTS.map(a => (
            <button key={a.key} type="button" style={seg(account === a.key)} onClick={() => setAccount(a.key)}>
              {a.label}
            </button>
          ))}
        </div>

        {/* ── MODE ── */}
        <div style={{display:'flex',gap:'.4rem',flexWrap:'wrap',marginTop:'.5rem'}}>
          <button type="button" style={seg(mode === 'dm')} onClick={() => setMode('dm')}>Message privé</button>
          <button type="button" style={seg(mode === 'comment')} onClick={() => setMode('comment')}>Commentaire sous une publication</button>
        </div>

        {mode === 'dm' && acc.brain === 'djimmy' && (
          <div style={{display:'flex',gap:'.6rem',flexWrap:'wrap',alignItems:'center',marginTop:'1rem'}}>
            <span style={{fontSize:'.72rem',fontWeight:700,padding:'.3rem .7rem',borderRadius:'100px',
                          border:'1px solid var(--line)',color: isOpen(new Date()) ? 'var(--ok)' : 'var(--muted)'}}>
              {isOpen(new Date()) ? '● Atelier ouvert' : '○ Atelier fermé'}
            </span>
            <label style={{fontSize:'.78rem',color:'var(--muted)',display:'flex',alignItems:'center',gap:'.4rem',cursor:'pointer'}}>
              <input type="checkbox" checked={afterHours} onChange={e => setAfterHours(e.target.checked)}
                     style={{width:'auto',accentColor:'var(--vio)'}} />
              Simuler une réception hors horaires
            </label>
          </div>
        )}

        {/* ── CONVERSATION ── */}
        <div className="glass" style={{padding:'1.1rem',minHeight:260,display:'flex',flexDirection:'column',gap:'.7rem',marginTop:'1.2rem'}}>
          {messages.length === 0 && (
            <p style={{color:'var(--muted)',fontSize:'.85rem',margin:'auto',textAlign:'center'}}>
              {mode === 'comment'
                ? <>Écrivez un commentaire comme un abonné le ferait.<br />Les mots-clés actifs sont proposés ci-dessous.</>
                : <>Aucun message pour l'instant.<br />Choisissez un exemple ci-dessous ou écrivez le vôtre.</>}
            </p>
          )}
          {messages.map((m, i) => (
            <div key={i} style={{display:'flex',flexDirection:'column',alignItems:m.kind==='in'?'flex-end':'flex-start',gap:'.25rem'}}>
              {m.kind === 'none'
                ? <p style={{fontSize:'.8rem',color:'var(--muted)',fontStyle:'italic'}}>{m.text}</p>
                : <div style={bubble(m.kind)}>{m.kind === 'in' ? m.text : renderWa(m.text)}</div>}
              {m.tag && (
                <span style={{fontSize:'.68rem',color:'var(--muted-light)',paddingLeft:'.2rem'}}>{m.tag}</span>
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
            placeholder={mode === 'comment' ? 'Commentaire de l\'abonné…' : 'Message du client…'}
            aria-label={mode === 'comment' ? 'Commentaire de l\'abonné' : 'Message du client'}
            value={input}
            onChange={e => setInput(e.target.value)}
          />
          <button type="submit" className="btn-g">Tester</button>
          {messages.length > 0 && (
            <button type="button" className="btn-outline" onClick={() => setMessages([])}>Effacer</button>
          )}
        </form>

        <div style={{marginTop:'1rem'}}>
          {suggestions.map(s => (
            <button key={s} type="button" onClick={() => ask(s)} style={{
              fontSize:'.75rem',padding:'.3rem .75rem',marginRight:'.4rem',marginTop:'.4rem',
              border:'1px solid var(--line)',background:'var(--surface)',color:'var(--txt-soft)',
              borderRadius:'100px',cursor:'pointer',fontFamily:'inherit',
            }}>{s}</button>
          ))}
        </div>

        {/* ── CAMPAGNES ── */}
        <h2 style={{fontFamily:'var(--display)',fontSize:'1.1rem',margin:'2.5rem 0 .4rem'}}>
          Campagnes actives — {acc.label}
        </h2>
        <p style={{fontSize:'.8rem',color:'var(--muted)',marginBottom:'.9rem',lineHeight:1.6}}>
          En vidéo, dites : « commente <strong>MOT</strong> et je t'envoie ça en privé ».
          Meta n'autorise qu'<strong>un seul message privé par commentaire</strong>, dans les <strong>7 jours</strong>.
        </p>
        <div style={{display:'flex',flexDirection:'column',gap:'.6rem'}}>
          {campaigns.map(c => (
            <div key={c.id} style={{border:'1px solid var(--line)',borderRadius:'12px',padding:'.8rem 1rem',background:'var(--surface)'}}>
              <div style={{display:'flex',gap:'.5rem',flexWrap:'wrap',alignItems:'center'}}>
                {c.keywords.map(k => (
                  <span key={k} className="u-mono" style={{fontSize:'.72rem',fontWeight:700,padding:'.15rem .5rem',
                        borderRadius:'4px',background:'var(--grad-soft)',border:'1px solid var(--line)'}}>{k}</span>
                ))}
                <span style={{fontSize:'.7rem',color:'var(--muted)'}}>
                  {c.media === 'all' ? 'toutes les publications' : `${c.media.length} publication(s) ciblée(s)`}
                </span>
              </div>
              <div style={{fontSize:'.78rem',color:'var(--muted)',marginTop:'.5rem',whiteSpace:'pre-wrap'}}>
                {dmFor(c, { name: 'Yacine' }).join('\n\n')}
              </div>
            </div>
          ))}
          {campaigns.length === 0 && (
            <p style={{fontSize:'.82rem',color:'var(--muted)'}}>Aucune campagne active pour ce compte.</p>
          )}
        </div>

        {/* ── INTENTIONS (compte Djimmy) ── */}
        {acc.brain === 'djimmy' && (
          <>
            <h2 style={{fontFamily:'var(--display)',fontSize:'1.1rem',margin:'2.5rem 0 .8rem'}}>
              Questions traitées automatiquement en DM
            </h2>
            <div className="cards-sm">
              {INTENT_LIST.map(i => (
                <div key={i.intent} style={{border:'1px solid var(--line)',borderRadius:'12px',
                     padding:'.7rem .9rem',background:'var(--surface)',fontSize:'.8rem'}}>
                  <strong>{i.label}</strong>
                  <div style={{color:'var(--muted)',fontSize:'.72rem',marginTop:'.15rem'}}>{i.intent}</div>
                </div>
              ))}
            </div>
          </>
        )}

        <p style={{fontSize:'.8rem',color:'var(--muted)',marginTop:'1.6rem',lineHeight:1.6}}>
          Pour créer une campagne, éditez <code>lib/campaigns.js</code>. Pour modifier les réponses
          commerciales, <code>lib/autoreply.js</code>. Pour brancher les comptes,
          suivez <code>docs/AUTO-REPONSES.md</code>.
        </p>
      </div>
    </>
  )
}
