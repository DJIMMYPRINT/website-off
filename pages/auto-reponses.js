import Head from 'next/head'
import { useEffect, useMemo, useState } from 'react'
import { WA, PHONE_DISPLAY, SITE_URL } from '../lib/constants'
import { RULES, FALLBACK, buildReply, isOpenNow } from '../lib/autoreply'

// Console des réponses automatiques (page de travail, pas une page vitrine).
//
// Elle sert à deux choses :
//  1. Voir et tester ce que le robot répond avant de le brancher — on tape
//     un message de client, on lit la réponse.
//  2. Répondre à la main sur les réseaux qui n'ont pas d'API branchée
//     (TikTok, LinkedIn) : on colle le message, on copie la réponse.
//
// Elle est en `noindex` et absente de la barre d'onglets : c'est un outil
// interne, pas une page de vente.

const EXAMPLES = [
  'Bonjour, chhal polo brodé pour 60 personnes ?',
  'Vous faites une seule pièce ?',
  'السلام عليكم، بشحال التيشيرت؟',
  'Livraison à Oran c\'est combien de temps ?',
  'Où en est ma commande DP-4KQ8ZT ?',
  'Vous êtes ouverts vendredi ?',
]

const card = {
  background: 'var(--surface)',
  border: '1px solid var(--line)',
  borderRadius: 'var(--r)',
  padding: '1.1rem',
  boxShadow: 'var(--shadow)',
}

const field = {
  width: '100%',
  padding: '.8rem .95rem',
  border: '1.5px solid var(--line)',
  borderRadius: 'var(--r-s)',
  fontSize: '.92rem',
  fontFamily: 'inherit',
  background: 'var(--well)',
  color: 'var(--txt)',
  outline: 'none',
}

const pill = (active) => ({
  padding: '.45rem .95rem',
  borderRadius: 100,
  fontSize: '.78rem',
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: 'inherit',
  border: '1.5px solid ' + (active ? 'transparent' : 'var(--line-strong)'),
  background: active ? 'var(--grad)' : 'transparent',
  color: active ? '#fff' : 'var(--muted)',
})

export default function AutoReponses() {
  const [message, setMessage] = useState(EXAMPLES[0])
  const [channel, setChannel] = useState('dm')
  const [name, setName] = useState('')
  const [copied, setCopied] = useState(false)
  const [status, setStatus] = useState(null)
  const [open, setOpen] = useState(null)

  // L'état du webhook vient du serveur : c'est le déploiement qui sait si
  // les variables d'environnement sont réellement présentes.
  useEffect(() => {
    let alive = true
    fetch('/api/social/webhook')
      .then(r => r.json())
      .then(d => { if (alive) setStatus(d) })
      .catch(() => { if (alive) setStatus({ error: true }) })
    // isOpenNow dépend de l'heure : calculée après le montage pour ne pas
    // faire diverger le HTML rendu par le serveur et le premier rendu client.
    setOpen(isOpenNow())
    return () => { alive = false }
  }, [])

  const reply = useMemo(
    () => buildReply(message, { channel, name }),
    [message, channel, name],
  )

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(reply.text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* clipboard refusé (http, permission) — le texte reste sélectionnable */
    }
  }

  const badge = !status ? ['…', 'var(--muted)']
    : status.error ? ['injoignable', 'var(--warn)']
    : status.mode === 'actif' ? ['actif', 'var(--ok)']
    : status.mode === 'simulation' ? ['simulation', 'var(--gold)']
    : ['inactif', 'var(--muted)']

  return (
    <>
      <Head>
        <title>Réponses automatiques — Djimmy Prints</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div style={{ padding: '1.6rem 1.15rem 2.5rem', position: 'relative', zIndex: 1 }}>
        <p className="s-lbl">Outil interne</p>
        <h1 className="s-ttl">Réponses <span className="kw">automatiques</span></h1>
        <p className="s-desc">
          Les messages privés et les commentaires Instagram / Facebook reçoivent une
          réponse immédiate, puis sont renvoyés vers WhatsApp. Testez ici ce que le
          robot répond — ou copiez la réponse pour l'envoyer à la main.
        </p>

        {/* ── ÉTAT DU WEBHOOK ── */}
        <div style={{ ...card, marginTop: '1.8rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '.6rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '.72rem', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--muted-light)' }}>
              Webhook Meta
            </span>
            <span style={{ fontSize: '.75rem', fontWeight: 700, color: badge[1] }}>● {badge[0]}</span>
          </div>
          <p style={{ fontSize: '.83rem', color: 'var(--muted)', lineHeight: 1.7, marginTop: '.7rem' }}>
            {!status || status.error
              ? 'État du serveur indisponible.'
              : status.mode === 'actif'
                ? 'Les réponses partent automatiquement sur Instagram et Facebook.'
                : status.mode === 'simulation'
                  ? 'SOCIAL_AUTOREPLY=off : les réponses sont calculées et tracées dans les logs, mais rien n\'est publié.'
                  : 'Variables META_APP_SECRET / META_PAGE_ACCESS_TOKEN absentes — le webhook refuse les évènements. Voir le README §8.'}
          </p>
          <p className="u-mono" style={{ fontSize: '.72rem', color: 'var(--muted-light)', marginTop: '.6rem', overflowWrap: 'anywhere' }}>
            URL à déclarer chez Meta : https://{SITE_URL}/api/social/webhook
          </p>
          {open === false && (
            <p style={{ fontSize: '.78rem', color: 'var(--gold)', marginTop: '.6rem' }}>
              🕐 Nous sommes hors horaires : les réponses privées le mentionnent automatiquement.
            </p>
          )}
        </div>

        {/* ── TESTEUR ── */}
        <div style={{ ...card, marginTop: '1rem' }}>
          <div style={{ display: 'flex', gap: '.5rem', marginBottom: '.9rem' }}>
            <button onClick={() => setChannel('dm')} style={pill(channel === 'dm')}>💬 Message privé</button>
            <button onClick={() => setChannel('comment')} style={pill(channel === 'comment')}>💭 Commentaire</button>
          </div>

          <label style={{ fontSize: '.75rem', color: 'var(--muted)', display: 'block', marginBottom: '.35rem' }}>
            Message du client
          </label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={3}
            style={{ ...field, resize: 'vertical' }}
            placeholder="Collez le message reçu…"
          />

          <label style={{ fontSize: '.75rem', color: 'var(--muted)', display: 'block', margin: '.8rem 0 .35rem' }}>
            Pseudo / prénom (facultatif)
          </label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            style={field}
            placeholder="karim.dz"
          />

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.4rem', marginTop: '.9rem' }}>
            {EXAMPLES.map(ex => (
              <button key={ex} onClick={() => setMessage(ex)} style={{
                fontSize: '.72rem', padding: '.32rem .7rem', borderRadius: 100, cursor: 'pointer',
                border: '1px solid var(--line)', background: 'var(--well)', color: 'var(--muted)', fontFamily: 'inherit',
              }}>
                {ex.length > 34 ? ex.slice(0, 33) + '…' : ex}
              </button>
            ))}
          </div>

          {/* Réponse */}
          <div style={{ marginTop: '1.2rem', borderTop: '1px solid var(--line)', paddingTop: '1.1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '.6rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '.75rem', color: 'var(--muted)' }}>
                Intention détectée :{' '}
                <strong style={{ color: reply.score > 0 ? 'var(--cya)' : 'var(--muted-light)' }}>
                  {reply.label}
                </strong>
                {reply.ref && <span className="u-mono" style={{ color: 'var(--muted-light)' }}> · {reply.ref}</span>}
              </span>
              <button onClick={copy} className="btn-outline" style={{ padding: '.4rem .9rem', fontSize: '.75rem' }}>
                {copied ? '✓ Copié' : 'Copier'}
              </button>
            </div>

            {reply.skipped ? (
              <p style={{ fontSize: '.85rem', color: 'var(--warn)', marginTop: '.8rem', lineHeight: 1.7 }}>
                Message vide, simple mention ou emoji seul : le robot ne répond pas.
                C'est volontaire — mieux vaut le silence qu'une réponse hors sujet
                sous votre publication.
              </p>
            ) : (
              <pre style={{
                whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginTop: '.8rem',
                background: 'var(--well)', border: '1px solid var(--line)', borderRadius: 'var(--r-s)',
                padding: '.9rem', fontSize: '.85rem', lineHeight: 1.7, color: 'var(--txt-soft)',
                fontFamily: 'inherit',
              }}>
                {reply.text}
              </pre>
            )}
            <p style={{ fontSize: '.72rem', color: 'var(--muted-light)', marginTop: '.5rem' }}>
              {reply.text.length} caractères · {channel === 'comment'
                ? 'réponse publique sous le commentaire, suivie d\'un message privé plus complet'
                : 'réponse envoyée en message privé'}
            </p>
          </div>
        </div>

        {/* ── RÈGLES ── */}
        <h2 className="s-ttl" style={{ fontSize: '1.35rem', marginTop: '2.4rem' }}>
          Les {RULES.length + 1} <span className="kw">règles</span>
        </h2>
        <p className="s-desc">
          Chaque règle compte les mots-clés reconnus dans le message (français, arabe
          et derja latinisée) ; la mieux notée l'emporte. Pour changer un texte ou
          ajouter un mot-clé : <code className="u-mono">lib/autoreply.js</code>.
        </p>

        <div style={{ display: 'grid', gap: '.7rem', marginTop: '1.2rem' }}>
          {[...RULES, FALLBACK].map(rule => (
            <div key={rule.key} style={{ ...card, padding: '.95rem 1.05rem' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '.6rem', flexWrap: 'wrap' }}>
                <strong style={{ fontSize: '.92rem', fontFamily: 'var(--display)' }}>{rule.label}</strong>
                <span className="u-mono" style={{ fontSize: '.7rem', color: 'var(--muted-light)' }}>{rule.key}</span>
              </div>
              <p style={{ fontSize: '.8rem', color: 'var(--muted)', marginTop: '.35rem' }}>{rule.hint}</p>
              {rule.keywords.length > 0 && (
                <p style={{ fontSize: '.74rem', color: 'var(--muted-light)', marginTop: '.5rem', lineHeight: 1.7 }}>
                  {rule.keywords.slice(0, 10).join(' · ')}
                  {rule.keywords.length > 10 && ` · +${rule.keywords.length - 10}`}
                </p>
              )}
              <button
                onClick={() => setMessage(rule.keywords[0] ? `Bonjour, ${rule.keywords[0]} ?` : 'Bonjour')}
                style={{
                  marginTop: '.6rem', fontSize: '.72rem', padding: '.3rem .75rem', borderRadius: 100,
                  border: '1px solid var(--line)', background: 'var(--well)', color: 'var(--cya)',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>
                Tester cette règle
              </button>
            </div>
          ))}
        </div>

        {/* ── RAPPEL ── */}
        <div style={{ ...card, marginTop: '1.6rem', borderColor: 'var(--line-strong)' }}>
          <p style={{ fontSize: '.85rem', color: 'var(--muted)', lineHeight: 1.8 }}>
            La réponse automatique fait gagner les premières minutes, elle ne conclut
            rien : chaque message renvoie vers WhatsApp ({PHONE_DISPLAY}), qui reste
            le canal où la commande se traite.
          </p>
          <a href={`https://wa.me/${WA}`} target="_blank" rel="noopener noreferrer" className="btn-g"
             style={{ marginTop: '.9rem', display: 'inline-flex' }}>
            💬 Ouvrir WhatsApp
          </a>
        </div>
      </div>
    </>
  )
}
