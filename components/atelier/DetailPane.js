import Icon, { P } from './icons'
import MiniCalendar from './MiniCalendar'
import { PRIORITIES } from '../../lib/atelier/priority'
import { humanDay, nextWorkday, relativeDue } from '../../lib/atelier/dates'
import { ORDER_STAGES, WA } from '../../lib/constants'

const STAGE = Object.fromEntries(ORDER_STAGES.map(s => [s.key, s]))

// Volet de droite : calendrier en permanence, détail de la tâche
// sélectionnée au-dessus.
//
// La section « pourquoi ce rang » n'est pas décorative. Le classement est
// calculé (lib/atelier/priority.js), donc il est explicable — et une
// priorité qu'on peut contester est une priorité à laquelle on se fie.

export default function DetailPane({
  task, note, selectedDay, byDay, onSelectDay, onSnooze, onToggle, onDelete, onClose,
}) {
  const pri = task ? (PRIORITIES[task.priority] || PRIORITIES.P4) : null
  const stage = task?.statut_commande ? STAGE[task.statut_commande] : null
  const due = task?.due_date ? relativeDue(task.due_date) : null

  return (
    <>
      <button className="atl-drawer-x" onClick={onClose} aria-label="Fermer le volet">
        <Icon d={P.close} size={15} />
      </button>

      {task ? (
        <div className="atl-card">
          <div className="atl-card-h">Détail</div>
          <div className="atl-det-t">{task.titre}</div>

          <div style={{ display: 'flex', gap: '.35rem', flexWrap: 'wrap', marginBottom: '.9rem' }}>
            <span className="atl-chip pri"
                  style={{ '--tone': `var(--${task.priority.toLowerCase()})`, '--tone-bg': `var(--${task.priority.toLowerCase()}-bg)` }}>
              {pri.label}
            </span>
            {task.needs_review && <span className="atl-chip review">à vérifier</span>}
          </div>

          <ul className="atl-det-l">
            {task.client && <li><span>Client</span><strong>{task.client}</strong></li>}
            {task.ref && <li><span>Commande</span><strong className="u-mono">{task.ref}</strong></li>}
            {stage && <li><span>Étape</span><strong>{stage.ic} {stage.label}</strong></li>}
            {task.due_date && (
              <li><span>Échéance</span>
                <strong style={due?.late ? { color: 'var(--p1)' } : undefined}>
                  {humanDay(task.due_date)}{due?.late ? ` — ${due.text}` : ''}
                </strong>
              </li>
            )}
            {task.montant_da ? (
              <li><span>Montant</span><strong>{task.montant_da.toLocaleString('fr-DZ')} DA</strong></li>
            ) : null}
            <li><span>Confiance</span><strong>{Math.round((task.confiance || 0) * 100)} %</strong></li>
          </ul>

          {task.reasons?.length > 0 && (
            <>
              <div className="atl-card-h" style={{ marginTop: '.2rem' }}>Pourquoi ce rang</div>
              <div className="atl-why">
                {task.reasons.map((r, i) => <i key={i}>{r}</i>)}
              </div>
            </>
          )}

          {task.extrait && (
            <>
              <div className="atl-card-h" style={{ marginTop: '1rem' }}>Dit à voix haute</div>
              <p className="atl-quote">« {task.extrait} »</p>
            </>
          )}

          <div className="atl-side-acts" style={{ marginTop: '1rem' }}>
            <button className="btn-g" onClick={onToggle}>
              <Icon d={P.check} size={14} stroke={2.4} />
              {task.done ? 'Rouvrir' : 'Fait'}
            </button>
            <button className="btn-outline" onClick={() => onSnooze(nextWorkday(task.due_date))}>
              <Icon d={P.tomorrow} size={14} />
              Reporter
            </button>
          </div>

          <div className="atl-side-acts" style={{ marginTop: '.4rem' }}>
            <a className="btn-outline"
               href={`https://wa.me/${WA}?text=${encodeURIComponent(
                 `Bonjour${task.client ? ` ${task.client}` : ''}, Djimmy Prints à l'appareil.` +
                 (task.ref ? ` Au sujet de la commande ${task.ref}.` : ''))}`}
               target="_blank" rel="noopener noreferrer">
              <Icon d={P.wa} size={14} /> WhatsApp
            </a>
            <button className="btn-outline" onClick={onDelete}
                    style={{ flex: '0 0 auto', padding: '.6rem .8rem' }}
                    aria-label="Supprimer la tâche">
              <Icon d={P.trash} size={14} />
            </button>
          </div>
        </div>
      ) : (
        <div className="atl-card">
          <div className="atl-card-h">Détail</div>
          <p style={{ fontSize: '.83rem', color: 'var(--muted)', lineHeight: 1.7 }}>
            Sélectionnez une ligne de la checklist pour voir d'où elle vient,
            à quelle commande elle se rattache, et pourquoi elle est classée là.
          </p>
        </div>
      )}

      <MiniCalendar selected={selectedDay} byDay={byDay} onSelect={onSelectDay} />

      {note && (
        <div className="atl-card">
          <div className="atl-card-h">Dernière dictée</div>
          {note.resume && (
            <p style={{ fontSize: '.82rem', color: 'var(--txt-soft)', lineHeight: 1.65, marginBottom: '.7rem' }}>
              {note.resume}
            </p>
          )}
          <p className="atl-quote" style={{ fontStyle: 'normal', maxHeight: 168, overflowY: 'auto' }}>
            {note.transcript}
          </p>
        </div>
      )}
    </>
  )
}
