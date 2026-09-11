import Icon, { P } from './icons'

// Le micro central.
//
// Deux partis pris :
//
//  · Les anneaux suivent le niveau sonore réel (`level`, 0…1, mesuré sur le
//    flux). Une animation en boucle donnerait la même impression de vie
//    quand le micro est coupé ou que la voix ne porte pas — ici, un silence
//    se voit, ce qui est une information utile avant d'avoir parlé une
//    minute pour rien.
//
//  · L'état de traitement est nommé, pas générique. « Transcription… » puis
//    « Analyse… » : quand ça prend six secondes, savoir laquelle des deux
//    étapes travaille change la façon dont on attend.

const LABEL = {
  transcribing: 'Transcription…',
  thinking: 'Analyse de la note…',
  saving: 'Enregistrement…',
}

function mmss(s) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

export default function MicOrb({ state, level = 0, seconds = 0, onStart, onStop, onCancel }) {
  const recording = state === 'recording'
  const busy = state === 'transcribing' || state === 'thinking' || state === 'saving'

  return (
    <div className="atl-mic-wrap">
      {recording && (
        <div className="atl-mic-hint rec">
          <span>● Enregistrement</span>
          <span className="t">{mmss(seconds)}</span>
          <button className="cx" onClick={onCancel}>annuler</button>
        </div>
      )}
      {busy && <div className="atl-mic-hint">{LABEL[state]}</div>}
      {state === 'idle' && (
        <div className="atl-mic-hint">Appuyez pour dicter vos notes</div>
      )}

      <button
        className={`atl-orb${recording ? ' rec' : ''}${busy ? ' busy' : ''}`}
        style={{ '--lvl': recording ? level : 0 }}
        onClick={recording ? onStop : busy ? undefined : onStart}
        disabled={busy}
        aria-label={recording ? "Arrêter l'enregistrement" : 'Dicter une note'}
      >
        {!busy && <span className="ring" />}
        {!busy && <span className="ring r2" />}
        <Icon d={recording ? P.stop : P.mic} size={recording ? 20 : 24} stroke={recording ? 2 : 1.8} />
      </button>
    </div>
  )
}
