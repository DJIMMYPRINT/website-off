import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'

import Backdrop from '../../components/Backdrop'
import Icon, { P } from '../../components/atelier/icons'
import MicOrb from '../../components/atelier/MicOrb'
import TaskRow from '../../components/atelier/TaskRow'
import WeekStrip from '../../components/atelier/WeekStrip'
import DetailPane from '../../components/atelier/DetailPane'

import useRecorder, { recorderSupported } from '../../lib/atelier/useRecorder'
import { rank, sortTasks, tally, PRIORITIES, PRIORITY_ORDER } from '../../lib/atelier/priority'
import { toTask } from '../../lib/atelier/model'
import {
  TODAY, addDays, weekDays, humanDay, daysFromToday, monthName, fromKey,
} from '../../lib/atelier/dates'
import {
  listTasks, saveTasks, listNotes, saveNote, pushTask, patchTask, pullTasks,
} from '../../lib/atelier/store'
import { demoTasks, demoNote, DEMO_FLAG } from '../../lib/atelier/demo'

// ═══════════════════════════════════════════════════════════════════════
//  ATELIER — assistant commercial vocal
//
//  Le gérant parle ; la note est transcrite, structurée en actions, classée
//  par urgence réelle et posée sur le bon jour. Tout le reste de cette page
//  n'est que la mise en scène de cette chaîne.
//
//  Deux invariants gouvernent l'écriture :
//
//   · **L'appareil répond toujours.** L'état vit dans localStorage et
//     s'affiche sans attendre le réseau ; le serveur n'est qu'une copie qui
//     survit au changement de téléphone. Une base absente dégrade la
//     synchronisation, elle ne bloque jamais la checklist.
//
//   · **Rien n'entre en base sans être passé par le doute.** Une action que
//     l'agent n'a pas su rattacher avec certitude part en revue au lieu de
//     se glisser silencieusement dans la liste du jour.
// ═══════════════════════════════════════════════════════════════════════

const VIEWS = [
  { key: 'jour',    label: "Le jour",         icon: P.today },
  { key: 'retard',  label: 'En retard',       icon: P.flag },
  { key: 'semaine', label: 'La semaine',      icon: P.week },
  { key: 'revue',   label: 'À vérifier',      icon: P.review },
  { key: 'fait',    label: 'Faites',          icon: P.done },
]

async function blobToBase64(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let bin = ''
  // btoa n'accepte pas un tableau de 500 000 éléments d'un coup : le passage
  // par apply dépasse la taille maximale de la pile d'appels. D'où le
  // découpage en tranches de 32 ko.
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK))
  }
  return btoa(bin)
}

export default function Atelier() {
  const [tasks, setTasks] = useState([])
  const [note, setNote] = useState(null)
  const [day, setDay] = useState(TODAY())
  const [view, setView] = useState('jour')
  const [pri, setPri] = useState(null)
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(null)
  const [drawer, setDrawer] = useState(false)
  const [micState, setMicState] = useState('idle')
  const [err, setErr] = useState(null)
  const [sync, setSync] = useState('local')
  const [typing, setTyping] = useState(false)
  const [draft, setDraft] = useState('')
  const [flash, setFlash] = useState(null)

  const searchRef = useRef(null)
  const rec = useRecorder()

  /* ── Démarrage ────────────────────────────────────────────────────── */

  useEffect(() => {
    let seeded = false
    try { seeded = window.localStorage.getItem(DEMO_FLAG) === '1' } catch { /* ignoré */ }

    const stored = listTasks()
    if (!stored.length && !seeded) {
      // Premier passage : on sème un jeu d'exemple qui couvre chaque cas
      // (un retard en production, un devis daté, une note flottante, une
      // ligne à vérifier), faute de quoi il n'y a rien à juger à l'écran.
      const demo = demoTasks()
      saveTasks(demo)
      saveNote(demoNote())
      try { window.localStorage.setItem(DEMO_FLAG, '1') } catch { /* ignoré */ }
      setTasks(demo)
      setNote(demoNote())
    } else {
      setTasks(stored)
      setNote(listNotes()[0] || null)
    }

    // La copie serveur, si elle existe, écrase la locale sur les champs
    // qu'elle connaît. Silencieux en cas d'échec : la liste locale est déjà
    // à l'écran et correcte.
    pullTasks().then(merged => {
      if (merged) { setTasks(merged); setSync('on') }
      else setSync('local')
    })
  }, [])

  /* ── Dérivés ──────────────────────────────────────────────────────── */

  const ranked = useMemo(() => tasks.map(rank), [tasks])

  const byDay = useMemo(() => {
    const map = {}
    for (const t of ranked) {
      const k = t.due_date || 'sans-date'
      ;(map[k] ||= []).push(t)
    }
    return map
  }, [ranked])

  const openCounts = useMemo(() => {
    const map = {}
    for (const t of ranked) {
      if (t.done || !t.due_date) continue
      map[t.due_date] = (map[t.due_date] || 0) + 1
    }
    return map
  }, [ranked])

  const overdue = useMemo(
    () => ranked.filter(t => !t.done && t.due_date && daysFromToday(t.due_date) < 0),
    [ranked]
  )
  const review = useMemo(() => ranked.filter(t => !t.done && t.needs_review), [ranked])

  const week = useMemo(() => weekDays(day), [day])

  const visible = useMemo(() => {
    let list
    if (view === 'jour')         list = ranked.filter(t => t.due_date === day && !t.done)
    else if (view === 'retard')  list = overdue
    else if (view === 'semaine') list = ranked.filter(t => week.includes(t.due_date) && !t.done)
    else if (view === 'revue')   list = review
    else                         list = ranked.filter(t => t.done)

    if (pri) list = list.filter(t => t.priority === pri)

    const needle = q.trim().toLowerCase()
    if (needle) {
      list = list.filter(t =>
        [t.titre, t.client, t.ref, t.extrait].filter(Boolean)
          .some(v => String(v).toLowerCase().includes(needle))
      )
    }
    return sortTasks(list)
  }, [ranked, view, day, week, pri, q, overdue, review])

  const counts = useMemo(() => tally(ranked.filter(t => t.due_date === day)), [ranked, day])
  const selected = useMemo(() => ranked.find(t => t.id === sel) || null, [ranked, sel])

  /* ── Écritures ────────────────────────────────────────────────────── */

  const apply = useCallback((id, patch) => {
    setTasks(prev => {
      const next = prev.map(t => (t.id === id ? { ...t, ...patch } : t))
      saveTasks(next)
      return next
    })
    // Optimiste : l'écran est déjà à jour, la synchro suit sans bloquer.
    patchTask(id, patch)
  }, [])

  const toggle = useCallback((id, done) => {
    apply(id, { done, done_at: done ? new Date().toISOString() : null })
  }, [apply])

  const snooze = useCallback((id, to) => {
    apply(id, { due_date: to, dated: true })
    setFlash(`Reporté à ${humanDay(to).toLowerCase()}`)
  }, [apply])

  const remove = useCallback((id) => {
    setTasks(prev => {
      const next = prev.filter(t => t.id !== id)
      saveTasks(next)
      return next
    })
    setSel(null)
    fetch(`/api/tasks/${id}`, { method: 'DELETE' }).catch(() => {})
  }, [])

  /* ── La chaîne vocale ─────────────────────────────────────────────── */

  // Les commandes ouvertes, reconstituées depuis les tâches déjà rattachées.
  // Sans ce contexte, « rappeler Karim pour les polos » reste une note
  // isolée ; avec, l'agent la raccroche à la bonne référence.
  const ordersContext = useMemo(() => {
    const seen = new Map()
    for (const t of ranked) {
      if (!t.ref || t.done || seen.has(t.ref)) continue
      seen.set(t.ref, { ref: t.ref, client: t.client, stage: t.statut_commande, total: t.montant_da })
    }
    return [...seen.values()]
  }, [ranked])

  const ingest = useCallback(async (transcript, source) => {
    setMicState('thinking')
    let data
    try {
      const res = await fetch('/api/voice/structure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, today: TODAY(), orders: ordersContext }),
      })
      data = await res.json()
      if (!res.ok) throw new Error(data?.error || "L'agent n'a pas répondu.")
    } catch (e) {
      setMicState('idle')
      setErr({
        title: "Analyse impossible",
        body: e.message + " La dictée est conservée ci-dessous : vous pouvez la relire et réessayer.",
        transcript,
      })
      return
    }

    const noteId = `n_${Date.now().toString(36)}`
    const fresh = (data.actions || []).map(a => toTask(a, { noteId, fallbackDay: TODAY() }))
    const newNote = {
      id: noteId,
      created_at: new Date().toISOString(),
      transcript,
      resume: data.resume || '',
      source,
    }

    saveNote(newNote)
    setNote(newNote)

    if (!fresh.length) {
      setMicState('idle')
      setFlash(data.resume || "Rien d'exploitable dans cette note.")
      return
    }

    setMicState('saving')
    setTasks(prev => {
      const next = [...fresh, ...prev]
      saveTasks(next)
      return next
    })
    for (const t of fresh) pushTask(t)

    const needing = fresh.filter(t => t.needs_review).length
    setMicState('idle')
    setDay(TODAY())
    setView(needing && needing === fresh.length ? 'revue' : 'jour')
    setFlash(
      `${fresh.length} action${fresh.length > 1 ? 's' : ''} ajoutée${fresh.length > 1 ? 's' : ''}` +
      (needing ? ` · ${needing} à vérifier` : '')
    )
  }, [ordersContext])

  const startMic = useCallback(async () => {
    setErr(null)
    await rec.start()
    setMicState('recording')
  }, [rec])

  const stopMic = useCallback(async () => {
    const captured = await rec.stop()
    if (!captured?.blob?.size) {
      setMicState('idle')
      setFlash("Rien n'a été enregistré.")
      return
    }

    setMicState('transcribing')
    let transcript
    try {
      const audio = await blobToBase64(captured.blob)
      const res = await fetch('/api/voice/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio, mimeType: captured.mimeType }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Transcription indisponible.')
      transcript = String(data.text || '').trim()
    } catch (e) {
      setMicState('idle')
      setErr({
        title: 'Transcription impossible',
        body: `${e.message} Vous pouvez saisir la note au clavier en attendant.`,
      })
      return
    }

    if (!transcript) {
      setMicState('idle')
      setFlash("Aucune parole détectée dans l'enregistrement.")
      return
    }
    await ingest(transcript, 'vocal')
  }, [rec, ingest])

  const cancelMic = useCallback(() => { rec.cancel(); setMicState('idle') }, [rec])

  // L'erreur remontée par le hook (permission, https, pas de micro) prend le
  // pas sur l'état local : le message dit laquelle des trois s'est produite.
  useEffect(() => {
    if (!rec.error) return
    setMicState('idle')
    setErr({ title: 'Micro indisponible', body: rec.error.message, offerTyping: true })
    rec.clearError()
  }, [rec])

  useEffect(() => {
    if (!flash) return
    const t = setTimeout(() => setFlash(null), 4200)
    return () => clearTimeout(t)
  }, [flash])

  /* ── Raccourcis clavier ───────────────────────────────────────────── */

  useEffect(() => {
    const onKey = (e) => {
      const inField = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)
      if (e.key === 'Escape') {
        if (inField) e.target.blur()
        else if (drawer) setDrawer(false)
        else setSel(null)
        return
      }
      if (inField || e.metaKey || e.ctrlKey || e.altKey) return

      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); return }
      if (e.key === 'm') { e.preventDefault(); micState === 'recording' ? stopMic() : micState === 'idle' && startMic(); return }

      if (e.key === 'j' || e.key === 'k') {
        e.preventDefault()
        if (!visible.length) return
        const i = visible.findIndex(t => t.id === sel)
        const next = e.key === 'j'
          ? Math.min(visible.length - 1, i < 0 ? 0 : i + 1)
          : Math.max(0, i < 0 ? 0 : i - 1)
        setSel(visible[next].id)
        return
      }
      if (e.key === 'x' && sel) {
        e.preventDefault()
        const t = visible.find(v => v.id === sel)
        if (t) toggle(t.id, !t.done)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [visible, sel, drawer, micState, startMic, stopMic, toggle])

  /* ── Rendu ────────────────────────────────────────────────────────── */

  const title =
    view === 'jour'    ? humanDay(day) :
    view === 'retard'  ? 'En retard' :
    view === 'semaine' ? `Semaine du ${fromKey(week[0]).getDate()} ${monthName(week[0])}` :
    view === 'revue'   ? 'À vérifier' : 'Faites'

  const openDetail = (id) => { setSel(id); setDrawer(true) }

  return (
    <>
      <Head>
        <title>Atelier — Djimmy Prints</title>
        {/* Cet espace contient des noms de clients et des montants, et il
            n'est pas derrière une authentification : au minimum, il ne doit
            pas finir dans un index de moteur de recherche. */}
        <meta name="robots" content="noindex, nofollow, noarchive" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </Head>

      <Backdrop />

      <div className="atl">
        {/* ══ BANDEAU ══ */}
        <header className="atl-top">
          <Link href="/" className="atl-brand" title="Retour au site">
            <img src="/djimmy-logo-96.png" alt="" />
            <b>Djimmy</b><i>Atelier</i>
          </Link>

          <div className="atl-search">
            <Icon d={P.search} size={15} />
            <input
              ref={searchRef}
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Rechercher un client, une référence, un mot dit…"
              aria-label="Rechercher dans les tâches"
            />
            <span className="atl-kbd">/</span>
          </div>

          <div className="atl-top-right">
            <span className={`atl-sync${sync === 'on' ? ' on' : ''}`}
                  title={sync === 'on'
                    ? 'Synchronisé avec la base'
                    : "Base non configurée : les tâches restent sur cet appareil"}>
              <b /><span>{sync === 'on' ? 'Synchronisé' : 'Cet appareil'}</span>
            </span>
          </div>
        </header>

        <div className="atl-body">
          {/* ══ RAIL ══ */}
          <nav className="atl-rail" aria-label="Filtres">
            <div className="atl-rail-lbl">Vues</div>
            {VIEWS.map(v => {
              const n =
                v.key === 'jour'    ? (byDay[day] || []).filter(t => !t.done).length :
                v.key === 'retard'  ? overdue.length :
                v.key === 'semaine' ? ranked.filter(t => week.includes(t.due_date) && !t.done).length :
                v.key === 'revue'   ? review.length :
                                      ranked.filter(t => t.done).length
              return (
                <button key={v.key}
                        className={`atl-nav${view === v.key ? ' on' : ''}`}
                        onClick={() => { setView(v.key); setPri(null) }}
                        aria-current={view === v.key ? 'true' : undefined}>
                  <span className="ic"><Icon d={v.icon} size={16} /></span>
                  <span className="tx">{v.label}</span>
                  {n > 0 && <span className="ct">{n}</span>}
                </button>
              )
            })}

            <div className="atl-rail-lbl">Priorité</div>
            {PRIORITY_ORDER.map(p => (
              <button key={p}
                      className={`atl-nav${pri === p ? ' on' : ''}`}
                      onClick={() => setPri(pri === p ? null : p)}
                      aria-pressed={pri === p}>
                <span className="ic"><span className={`atl-dot ${p}`} /></span>
                <span className="tx">{PRIORITIES[p].label}</span>
                <span className="ct">{ranked.filter(t => !t.done && t.priority === p).length || ''}</span>
              </button>
            ))}

            <div className="atl-rail-lbl">Saisie</div>
            <button className="atl-nav" onClick={() => setTyping(v => !v)}>
              <span className="ic"><Icon d={P.keyboard} size={16} /></span>
              <span className="tx">Écrire une note</span>
            </button>
          </nav>

          {/* ══ COLONNE CENTRALE ══ */}
          <main className="atl-main">
            <div className="atl-head">
              <div>
                <h1 className="atl-h1">
                  {view === 'jour' && day === TODAY() ? <>Votre <span>journée</span></> : title}
                </h1>
                <p className="atl-sub">
                  {view === 'jour'
                    ? `${humanDay(day)} · ${counts.open} ouverte${counts.open > 1 ? 's' : ''}, ${counts.done} faite${counts.done > 1 ? 's' : ''}`
                    : `${visible.length} élément${visible.length > 1 ? 's' : ''}`}
                </p>
              </div>

              {view === 'jour' && (
                <div className="atl-daynav">
                  <button onClick={() => setDay(addDays(day, -1))} aria-label="Jour précédent">
                    <Icon d={P.left} size={15} />
                  </button>
                  <button className="wide" onClick={() => setDay(TODAY())}>Aujourd'hui</button>
                  <button onClick={() => setDay(addDays(day, 1))} aria-label="Jour suivant">
                    <Icon d={P.right} size={15} />
                  </button>
                </div>
              )}
            </div>

            {err && (
              <div className="atl-err" role="alert">
                <Icon d={P.review} size={17} style={{ flexShrink: 0, marginTop: 2, color: 'var(--p1)' }} />
                <div>
                  <b>{err.title}</b> — {err.body}
                  {err.transcript && (
                    <p className="atl-quote" style={{ marginTop: '.5rem', fontStyle: 'normal' }}>
                      {err.transcript}
                    </p>
                  )}
                  {(err.offerTyping || err.transcript) && (
                    <button className="btn-outline"
                            style={{ marginTop: '.6rem', padding: '.45rem .9rem', fontSize: '.76rem' }}
                            onClick={() => { setTyping(true); setDraft(err.transcript || ''); setErr(null) }}>
                      <Icon d={P.keyboard} size={13} /> Saisir au clavier
                    </button>
                  )}
                </div>
                <button onClick={() => setErr(null)} aria-label="Fermer">×</button>
              </div>
            )}

            {flash && (
              <div className="atl-review" role="status" style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                <Icon d={P.sparkle} size={15} style={{ color: 'var(--p2)', flexShrink: 0 }} />
                <p style={{ color: 'var(--txt-soft)' }}>{flash}</p>
              </div>
            )}

            {typing && (
              <div className="atl-card" style={{ marginBottom: '1rem' }}>
                <div className="atl-card-h">Note écrite</div>
                <div className="atl-type">
                  <textarea
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    placeholder="Rappeler Karim du restaurant El Djazaïr pour les tailles, la sérigraphie part demain…"
                    aria-label="Note à structurer"
                  />
                  <div className="atl-type-row">
                    <button className="btn-outline" style={{ padding: '.55rem 1rem', fontSize: '.78rem' }}
                            onClick={() => { setTyping(false); setDraft('') }}>
                      Annuler
                    </button>
                    <button className="btn-g" style={{ padding: '.55rem 1.2rem', fontSize: '.78rem' }}
                            disabled={!draft.trim() || micState !== 'idle'}
                            onClick={async () => {
                              const text = draft.trim()
                              setTyping(false); setDraft('')
                              await ingest(text, 'clavier')
                            }}>
                      <Icon d={P.sparkle} size={14} /> Structurer
                    </button>
                  </div>
                </div>
              </div>
            )}

            {view === 'jour' && (
              <>
                {/* Trois nombres, et la couleur de chacun dit la même chose
                    que son libellé : rouge pour ce qui a glissé, or pour ce
                    qui attend, vert pour ce qui est derrière nous. Un retard
                    peint en vert dirait le contraire du chiffre. */}
                <div className="atl-tiles">
                  <div className="atl-tile" style={{ '--tone': 'var(--p1)' }}>
                    <div className="n">{overdue.length}</div>
                    <div className="l">En retard</div>
                  </div>
                  <div className="atl-tile" style={{ '--tone': 'var(--p2)' }}>
                    <div className="n">{counts.P1 + counts.P2}</div>
                    <div className="l">À traiter</div>
                  </div>
                  <div className="atl-tile" style={{ '--tone': 'var(--p3)' }}>
                    <div className="n">{counts.done}</div>
                    <div className="l">Faites</div>
                  </div>
                </div>

                <WeekStrip days={week} counts={openCounts} selected={day} onSelect={setDay} />
              </>
            )}

            {view !== 'revue' && review.length > 0 && (
              <div className="atl-review">
                <h4><Icon d={P.review} size={14} /> {review.length} action{review.length > 1 ? 's' : ''} à vérifier</h4>
                <p>
                  L'agent n'a pas su les rattacher avec certitude — nom mal transcrit,
                  référence absente ou montant ambigu. Elles attendent votre relecture
                  plutôt que d'entrer seules dans la checklist.{' '}
                  <button onClick={() => setView('revue')}
                          style={{ background: 'none', border: 'none', color: 'var(--p2)', cursor: 'pointer',
                                   font: 'inherit', textDecoration: 'underline', padding: 0 }}>
                    Les voir
                  </button>
                </p>
              </div>
            )}

            {visible.length ? (
              <div className="atl-list">
                {visible.map(t => (
                  <TaskRow key={t.id} task={t} selected={sel === t.id}
                           onToggle={() => toggle(t.id, !t.done)}
                           onOpen={() => openDetail(t.id)}
                           onSnooze={(to) => snooze(t.id, to)} />
                ))}
              </div>
            ) : (
              <div className="atl-empty">
                <span className="em-ic"><Icon d={view === 'fait' ? P.done : P.mic} size={26} /></span>
                <h3>
                  {view === 'jour'   ? 'Journée dégagée' :
                   view === 'retard'? 'Aucun retard' :
                   view === 'revue' ? 'Rien à vérifier' :
                   view === 'fait'  ? 'Rien de coché pour l’instant' : 'Semaine vide'}
                </h3>
                <p>
                  {q || pri
                    ? 'Aucune tâche ne correspond à ce filtre.'
                    : view === 'jour'
                      ? "Appuyez sur le micro et dictez ce qui s'est dit au téléphone — l'agent en fera une checklist classée."
                      : 'Rien de ce côté pour le moment.'}
                </p>
              </div>
            )}
          </main>

          {/* ══ VOLET ══ */}
          <aside className={`atl-side${drawer ? ' open' : ''}`} aria-label="Détail et calendrier">
            <DetailPane
              task={selected}
              note={note}
              selectedDay={day}
              byDay={byDay}
              onSelectDay={(d) => { setDay(d); setView('jour'); setDrawer(false) }}
              onSnooze={(to) => selected && snooze(selected.id, to)}
              onToggle={() => selected && toggle(selected.id, !selected.done)}
              onDelete={() => selected && remove(selected.id)}
              onClose={() => setDrawer(false)}
            />
          </aside>
          {drawer && <div className="atl-scrim" onClick={() => setDrawer(false)} />}
        </div>

        <MicOrb
          state={micState}
          level={rec.level}
          seconds={rec.seconds}
          onStart={recorderSupported() ? startMic : () => setTyping(true)}
          onStop={stopMic}
          onCancel={cancelMic}
        />
      </div>
    </>
  )
}
