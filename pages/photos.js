import Head from 'next/head'
import { useCallback, useEffect, useRef, useState } from 'react'

// Bibliothèque de photos produit.
//
// Page privée : elle n'est pas dans la barre d'onglets et demande le mot
// de passe de PHOTOS_PASSWORD. Tout passe par /api/photos, jamais par
// Supabase directement — la clé service_role ne doit pas atteindre le
// navigateur.

// On ré-encode côté navigateur avant l'envoi. Trois problèmes réglés d'un
// coup : le poids (l'API refuse au-delà de 4 Mo), le coût du classement
// (une image plus petite coûte moins de jetons), et le HEIC de l'iPhone
// (que l'API ne lit pas, mais que Safari sait décoder — le canvas le
// ressort en JPEG).
const COTE_MAX = 1600
const QUALITE = 0.85

function preparer(fichier) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(fichier)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const facteur = Math.min(1, COTE_MAX / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * facteur)
      canvas.height = Math.round(img.height * facteur)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('conversion impossible'))),
        'image/jpeg',
        QUALITE
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('image illisible'))
    }
    img.src = url
  })
}

const carte = {
  background: 'var(--surface)', border: '1px solid var(--line)',
  borderRadius: 'var(--r-s)', padding: '1rem',
}

const champ = {
  width: '100%', padding: '.8rem 1rem', borderRadius: 'var(--r-s)',
  border: '1.5px solid var(--line)', background: 'var(--well)',
  color: 'var(--txt)', fontSize: '1rem', fontFamily: 'inherit', outline: 'none',
}

const bouton = {
  padding: '.8rem 1.2rem', borderRadius: 'var(--r-s)', border: 'none',
  background: 'var(--grad)', color: '#fff', fontWeight: 600,
  fontSize: '.95rem', fontFamily: 'inherit', cursor: 'pointer',
}

const boutonPlat = {
  ...bouton, background: 'var(--surface-2)', color: 'var(--txt)',
  border: '1px solid var(--line)',
}

// ── Écran de connexion ───────────────────────────────────────────────
function Connexion({ onConnecte }) {
  const [motdepasse, setMotdepasse] = useState('')
  const [erreur, setErreur] = useState('')
  const [envoi, setEnvoi] = useState(false)

  async function soumettre(e) {
    e.preventDefault()
    setEnvoi(true)
    setErreur('')
    try {
      const res = await fetch('/api/photos/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motdepasse }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) onConnecte()
      else setErreur(data.error || 'Connexion impossible.')
    } catch {
      setErreur('Connexion impossible.')
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <form onSubmit={soumettre} style={{ ...carte, maxWidth: 380, margin: '3rem auto' }}>
      <h1 style={{ fontFamily: 'var(--display)', fontSize: '1.4rem', marginBottom: '.4rem' }}>
        Bibliothèque photos
      </h1>
      <p style={{ color: 'var(--muted)', fontSize: '.9rem', marginBottom: '1.2rem' }}>
        Accès réservé.
      </p>
      <input
        type="password" value={motdepasse} onChange={(e) => setMotdepasse(e.target.value)}
        placeholder="Mot de passe" autoFocus style={champ}
        autoComplete="current-password"
      />
      {erreur && (
        <p style={{ color: 'var(--warn)', fontSize: '.85rem', marginTop: '.7rem' }}>{erreur}</p>
      )}
      <button type="submit" disabled={envoi} style={{ ...bouton, width: '100%', marginTop: '1rem' }}>
        {envoi ? 'Vérification…' : 'Entrer'}
      </button>
    </form>
  )
}

// ── Vue plein écran d'une photo ──────────────────────────────────────
function Detail({ photo, albums, onFermer, onAlbumChange, onSupprimer }) {
  const [note, setNote] = useState('')

  // Partage natif : sur iPhone, cela ouvre la feuille de partage et permet
  // d'envoyer directement dans une conversation WhatsApp. Un lien wa.me ne
  // sait pas joindre un fichier, seulement du texte.
  async function envoyer() {
    try {
      const reponse = await fetch(photo.url)
      const blob = await reponse.blob()
      const fichier = new File([blob], `${photo.album}.jpg`, { type: blob.type || 'image/jpeg' })
      if (navigator.canShare?.({ files: [fichier] })) {
        await navigator.share({ files: [fichier], text: photo.album })
        return
      }
      // Repli : sur un navigateur sans partage de fichiers (souvent un
      // ordinateur), le lien signé reste utilisable pendant une heure.
      await navigator.clipboard.writeText(photo.url)
      setNote('Lien copié (valable 1 h).')
    } catch (err) {
      if (err?.name === 'AbortError') return // partage annulé par l'utilisateur
      setNote('Partage impossible sur cet appareil.')
    }
  }

  return (
    <div
      onClick={onFermer}
      style={{
        position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(0,0,0,.86)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
        overflowY: 'auto',
      }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ ...carte, maxWidth: 460, width: '100%' }}>
        {photo.url ? (
          <img
            src={photo.url} alt={photo.description || photo.album}
            style={{ width: '100%', borderRadius: 'var(--r-s)', display: 'block' }}
          />
        ) : (
          <p style={{ color: 'var(--muted)' }}>Image indisponible.</p>
        )}

        <p style={{ marginTop: '.9rem', fontSize: '.95rem' }}>{photo.description || '—'}</p>

        <label style={{ display: 'block', marginTop: '.9rem', fontSize: '.8rem', color: 'var(--muted)' }}>
          Album
        </label>
        <select
          value={photo.album}
          onChange={(e) => onAlbumChange(photo.id, e.target.value)}
          style={{ ...champ, marginTop: '.3rem' }}
        >
          {albums.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>

        <div style={{ display: 'flex', gap: '.6rem', marginTop: '1rem', flexWrap: 'wrap' }}>
          <button onClick={envoyer} style={{ ...bouton, flex: 1 }}>Envoyer</button>
          <button onClick={onFermer} style={boutonPlat}>Fermer</button>
          <button
            onClick={() => onSupprimer(photo.id)}
            style={{ ...boutonPlat, color: 'var(--warn)' }}
          >
            Supprimer
          </button>
        </div>
        {note && (
          <p style={{ color: 'var(--muted)', fontSize: '.82rem', marginTop: '.7rem' }}>{note}</p>
        )}
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────
export default function Photos() {
  const [connecte, setConnecte] = useState(null) // null = pas encore vérifié
  const [photos, setPhotos] = useState([])
  const [albums, setAlbums] = useState([])
  const [compteurs, setCompteurs] = useState([])
  const [album, setAlbum] = useState('')
  const [q, setQ] = useState('')
  const [encore, setEncore] = useState(false)
  const [chargement, setChargement] = useState(false)
  const [erreur, setErreur] = useState('')
  const [envois, setEnvois] = useState([]) // { nom, etat }
  const [ouverte, setOuverte] = useState(null)
  const inputFichier = useRef(null)

  useEffect(() => {
    fetch('/api/photos/session')
      .then((r) => r.json())
      .then((d) => setConnecte(Boolean(d.connecte)))
      .catch(() => setConnecte(false))
  }, [])

  const charger = useCallback(
    async (decalage = 0) => {
      setChargement(true)
      setErreur('')
      try {
        const params = new URLSearchParams({ album, q, decalage: String(decalage) })
        const res = await fetch(`/api/photos?${params}`)
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          setErreur(data.error || 'Lecture impossible.')
          return
        }
        setPhotos((p) => (decalage === 0 ? data.photos : [...p, ...data.photos]))
        setAlbums(data.albums || [])
        setCompteurs(data.compteurs || [])
        setEncore(Boolean(data.encore))
      } catch {
        setErreur('Lecture impossible.')
      } finally {
        setChargement(false)
      }
    },
    [album, q]
  )

  // Recharge à chaque changement de filtre. Le délai laisse le temps de
  // finir de taper avant de lancer une requête par caractère.
  useEffect(() => {
    if (!connecte) return
    const t = setTimeout(() => charger(0), q ? 300 : 0)
    return () => clearTimeout(t)
  }, [connecte, charger, q])

  async function envoyerFichiers(liste) {
    const fichiers = Array.from(liste || [])
    if (fichiers.length === 0) return
    setEnvois(fichiers.map((f) => ({ nom: f.name, etat: 'en attente' })))

    // Un par un, volontairement : chaque envoi déclenche un appel au
    // modèle, et les lancer tous en parallèle ferait tomber la limite de
    // débit sur un lot un peu gros.
    for (let i = 0; i < fichiers.length; i++) {
      setEnvois((e) => e.map((x, j) => (j === i ? { ...x, etat: 'classement…' } : x)))
      try {
        const blob = await preparer(fichiers[i])
        const res = await fetch('/api/photos', {
          method: 'POST',
          headers: { 'Content-Type': 'image/jpeg' },
          body: blob,
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || 'échec')
        setEnvois((e) => e.map((x, j) => (j === i ? { ...x, etat: data.photo.album } : x)))
      } catch (err) {
        setEnvois((e) => e.map((x, j) => (j === i ? { ...x, etat: err.message } : x)))
      }
    }

    await charger(0)
    // On laisse le récapitulatif affiché quelques secondes : c'est le seul
    // endroit où l'on voit dans quel album chaque photo est partie.
    setTimeout(() => setEnvois([]), 6000)
  }

  async function changerAlbum(id, nouvel) {
    setPhotos((p) => p.map((x) => (x.id === id ? { ...x, album: nouvel } : x)))
    setOuverte((o) => (o && o.id === id ? { ...o, album: nouvel } : o))
    await fetch(`/api/photos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ album: nouvel }),
    }).catch(() => {})
    charger(0)
  }

  async function supprimer(id) {
    if (!window.confirm('Supprimer cette photo ?')) return
    setOuverte(null)
    setPhotos((p) => p.filter((x) => x.id !== id))
    await fetch(`/api/photos/${id}`, { method: 'DELETE' }).catch(() => {})
    charger(0)
  }

  async function deconnecter() {
    await fetch('/api/photos/session', { method: 'DELETE' }).catch(() => {})
    setConnecte(false)
    setPhotos([])
  }

  const nombreDe = (nom) => compteurs.find((c) => c.album === nom)?.nombre || 0

  if (connecte === null) return null
  if (!connecte) {
    return (
      <>
        <Head><title>Bibliothèque photos — Djimmy Prints</title></Head>
        <Connexion onConnecte={() => setConnecte(true)} />
      </>
    )
  }

  return (
    <>
      <Head>
        <title>Bibliothèque photos — Djimmy Prints</title>
        <meta name="robots" content="noindex" />
      </Head>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '1.2rem 1rem 5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.8rem', marginBottom: '1rem' }}>
          <h1 style={{ fontFamily: 'var(--display)', fontSize: '1.35rem', flex: 1 }}>
            Bibliothèque
          </h1>
          <button onClick={deconnecter} style={{ ...boutonPlat, padding: '.5rem .8rem', fontSize: '.82rem' }}>
            Quitter
          </button>
        </div>

        <input
          type="search" value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Chercher : jaune, col, réfléchissant…" style={champ}
        />

        <div style={{ display: 'flex', gap: '.5rem', overflowX: 'auto', padding: '.9rem 0', scrollbarWidth: 'none' }}>
          {[{ nom: '', libelle: 'Tout' }, ...albums.map((a) => ({ nom: a, libelle: a }))].map((a) => {
            const actif = album === a.nom
            const n = a.nom ? nombreDe(a.nom) : 0
            return (
              <button
                key={a.nom || 'tout'}
                onClick={() => setAlbum(a.nom)}
                style={{
                  ...boutonPlat, padding: '.45rem .8rem', fontSize: '.84rem',
                  whiteSpace: 'nowrap', flexShrink: 0,
                  background: actif ? 'var(--grad)' : 'var(--surface-2)',
                  color: actif ? '#fff' : 'var(--txt)',
                }}
              >
                {a.libelle}{a.nom && n > 0 ? ` ${n}` : ''}
              </button>
            )
          })}
        </div>

        <input
          ref={inputFichier} type="file" accept="image/*" multiple
          onChange={(e) => { envoyerFichiers(e.target.files); e.target.value = '' }}
          style={{ display: 'none' }}
        />
        <button onClick={() => inputFichier.current?.click()} style={{ ...bouton, width: '100%' }}>
          Ajouter des photos
        </button>

        {envois.length > 0 && (
          <div style={{ ...carte, marginTop: '.9rem', padding: '.8rem 1rem' }}>
            {envois.map((e, i) => (
              <div
                key={i}
                style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', fontSize: '.84rem', padding: '.15rem 0' }}
              >
                <span style={{ color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {e.nom}
                </span>
                <span style={{ flexShrink: 0 }}>{e.etat}</span>
              </div>
            ))}
          </div>
        )}

        {erreur && (
          <p style={{ color: 'var(--warn)', fontSize: '.88rem', marginTop: '1rem' }}>{erreur}</p>
        )}

        <div
          style={{
            display: 'grid', gap: '.5rem', marginTop: '1rem',
            gridTemplateColumns: 'repeat(auto-fill, minmax(104px, 1fr))',
          }}
        >
          {photos.map((p) => (
            <button
              key={p.id} onClick={() => setOuverte(p)}
              title={p.description || p.album}
              style={{
                padding: 0, border: '1px solid var(--line)', borderRadius: 'var(--r-s)',
                overflow: 'hidden', background: 'var(--well)', cursor: 'pointer',
                aspectRatio: '1 / 1',
              }}
            >
              {p.url ? (
                <img
                  src={p.url} alt={p.description || p.album} loading="lazy"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              ) : (
                <span style={{ color: 'var(--muted)', fontSize: '.75rem' }}>indispo.</span>
              )}
            </button>
          ))}
        </div>

        {photos.length === 0 && !chargement && (
          <p style={{ color: 'var(--muted)', textAlign: 'center', marginTop: '2.5rem', fontSize: '.9rem' }}>
            {q || album ? 'Rien ne correspond.' : 'Aucune photo pour l’instant.'}
          </p>
        )}

        {encore && (
          <button
            onClick={() => charger(photos.length)} disabled={chargement}
            style={{ ...boutonPlat, width: '100%', marginTop: '1rem' }}
          >
            {chargement ? 'Chargement…' : 'Charger plus'}
          </button>
        )}
      </div>

      {ouverte && (
        <Detail
          photo={ouverte} albums={albums}
          onFermer={() => setOuverte(null)}
          onAlbumChange={changerAlbum}
          onSupprimer={supprimer}
        />
      )}
    </>
  )
}
