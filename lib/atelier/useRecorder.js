import { useCallback, useEffect, useRef, useState } from 'react'

// Microphone capture for the atelier.
//
// Three things this hook exists to get right, none of which are obvious:
//
//  1. **The container format is not the same on every phone.** Chrome on
//     Android records `audio/webm;codecs=opus`; Safari on iOS only does
//     `audio/mp4`. MediaRecorder silently produces an empty blob if handed a
//     mime type it cannot do, so the type is probed rather than assumed, and
//     the one actually used is reported back — the transcription endpoint
//     needs it to name the file it uploads.
//
//  2. **getUserMedia needs a secure context.** It resolves only over HTTPS or
//     on localhost; over plain http on a LAN address it rejects with a
//     NotAllowedError that reads like a denied permission. The error mapping
//     at the bottom says which of the two actually happened.
//
//  3. **The track has to be stopped by hand.** Dropping the reference leaves
//     the browser's recording indicator lit and the mic hot. Every exit path
//     — stop, cancel, unmount, error — goes through `release()`.
//
// The hook also exposes a live `level` (0…1, RMS over the time-domain data)
// so the mic button can react to the voice instead of animating on a timer.

const MIME_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/ogg;codecs=opus',
  'audio/ogg',
]

function pickMime() {
  if (typeof MediaRecorder === 'undefined') return ''
  for (const m of MIME_CANDIDATES) {
    try { if (MediaRecorder.isTypeSupported(m)) return m } catch { /* older impls throw */ }
  }
  return ''
}

export function recorderSupported() {
  return typeof window !== 'undefined' &&
    typeof MediaRecorder !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia)
}

export default function useRecorder() {
  const [recording, setRecording] = useState(false)
  const [level, setLevel] = useState(0)
  const [seconds, setSeconds] = useState(0)
  const [error, setError] = useState(null)

  const streamRef = useRef(null)
  const recRef = useRef(null)
  const chunksRef = useRef([])
  const audioCtxRef = useRef(null)
  const rafRef = useRef(null)
  const tickRef = useRef(null)
  const resolveRef = useRef(null)

  const release = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    clearInterval(tickRef.current)
    try { streamRef.current?.getTracks().forEach(t => t.stop()) } catch { /* already gone */ }
    try { audioCtxRef.current?.close() } catch { /* already closed */ }
    streamRef.current = null
    audioCtxRef.current = null
    recRef.current = null
    setLevel(0)
  }, [])

  useEffect(() => release, [release])

  const start = useCallback(async () => {
    if (recording) return
    setError(null)
    setSeconds(0)
    chunksRef.current = []

    if (!recorderSupported()) {
      setError({
        code: 'unsupported',
        message: "Ce navigateur ne sait pas enregistrer. Utilisez Chrome sur Android, ou Safari sur iPhone.",
      })
      return
    }

    let stream
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      })
    } catch (err) {
      const secure = typeof window !== 'undefined' && window.isSecureContext
      setError(
        !secure
          ? { code: 'insecure', message: "Le micro exige une connexion sécurisée (https). Ouvrez le site en https ou depuis localhost." }
          : err?.name === 'NotFoundError'
            ? { code: 'nodevice', message: "Aucun micro détecté sur cet appareil." }
            : { code: 'denied', message: "Accès au micro refusé. Autorisez-le dans les réglages du navigateur, puis réessayez." }
      )
      return
    }

    streamRef.current = stream

    // Live level meter. AudioContext often starts suspended until a gesture;
    // start() is only ever called from a click, so resuming here is allowed.
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext
      const ctx = new Ctx()
      audioCtxRef.current = ctx
      if (ctx.state === 'suspended') await ctx.resume()
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 1024
      analyser.smoothingTimeConstant = 0.75
      ctx.createMediaStreamSource(stream).connect(analyser)
      const buf = new Uint8Array(analyser.fftSize)

      const loop = () => {
        analyser.getByteTimeDomainData(buf)
        let sum = 0
        for (let i = 0; i < buf.length; i++) {
          const v = (buf[i] - 128) / 128
          sum += v * v
        }
        // RMS is small for ordinary speech; ×3.2 maps a normal voice to most
        // of the ring rather than a barely visible wobble.
        setLevel(Math.min(1, Math.sqrt(sum / buf.length) * 3.2))
        rafRef.current = requestAnimationFrame(loop)
      }
      loop()
    } catch {
      // No meter is a cosmetic loss; recording itself carries on.
    }

    const mimeType = pickMime()
    let rec
    try {
      rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
    } catch {
      rec = new MediaRecorder(stream)
    }
    recRef.current = rec

    rec.ondataavailable = e => { if (e.data?.size) chunksRef.current.push(e.data) }
    rec.onstop = () => {
      const type = rec.mimeType || mimeType || 'audio/webm'
      const blob = new Blob(chunksRef.current, { type })
      release()
      setRecording(false)
      resolveRef.current?.(blob.size ? { blob, mimeType: type } : null)
      resolveRef.current = null
    }

    // A timeslice makes data arrive during the take rather than only at the
    // end, so a tab closed mid-sentence still leaves usable chunks.
    rec.start(1000)
    setRecording(true)
    tickRef.current = setInterval(() => setSeconds(s => s + 1), 1000)
  }, [recording, release])

  /** Resolves to `{ blob, mimeType }`, or null if nothing was captured. */
  const stop = useCallback(() => {
    return new Promise(resolve => {
      const rec = recRef.current
      if (!rec || rec.state === 'inactive') {
        release(); setRecording(false); resolve(null); return
      }
      resolveRef.current = resolve
      try { rec.stop() } catch { release(); setRecording(false); resolve(null) }
    })
  }, [release])

  const cancel = useCallback(() => {
    const rec = recRef.current
    resolveRef.current = null
    chunksRef.current = []
    try { if (rec && rec.state !== 'inactive') rec.stop() } catch { /* ignore */ }
    release()
    setRecording(false)
  }, [release])

  return { recording, level, seconds, error, start, stop, cancel, clearError: () => setError(null) }
}
