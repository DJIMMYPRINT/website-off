import Icon, { P } from './icons'
import { PRIORITIES } from '../../lib/atelier/priority'
import { relativeDue, nextWorkday } from '../../lib/atelier/dates'
import { WA } from '../../lib/constants'
import { ORDER_STAGES } from '../../lib/constants'

const STAGE = Object.fromEntries(ORDER_STAGES.map(s => [s.key, s]))

// Une ligne = un titre, une ligne de métadonnées, des actions au survol.
//
// La priorité s'affiche deux fois volontairement : l'échine colorée à
// gauche pour balayer la liste, la puce textuelle pour la lire. La couleur
// ne porte jamais l'information seule — c'est la règle qui rend la liste
// utilisable en daltonisme comme à l'impression.

export default function TaskRow({ task, selected, onToggle, onOpen, onSnooze }) {
  const pri = PRIORITIES[task.priority] || PRIORITIES.P4
  const due = relativeDue(task.due_date)
  const stage = task.statut_commande ? STAGE[task.statut_commande] : null

  const waText = encodeURIComponent(
    `Bonjour${task.client ? ` ${task.client}` : ''}, Djimmy Prints à l'appareil.` +
    (task.ref ? ` Au sujet de la commande ${task.ref}.` : '')
  )

  const stop = (fn) => (e) => { e.stopPropagation(); fn() }

  return (
    <div
      className={`atl-row${selected ? ' sel' : ''}${task.done ? ' done' : ''}`}
      style={{ '--tone': `var(--${task.priority.toLowerCase()})`, '--tone-bg': `var(--${task.priority.toLowerCase()}-bg)` }}
      onClick={onOpen}
      role="button" tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen() } }}
    >
      <button
        className={`atl-check${task.done ? ' on' : ''}`}
        onClick={stop(onToggle)}
        aria-pressed={task.done}
        aria-label={task.done ? 'Rouvrir la tâche' : 'Marquer comme faite'}
      >
        <Icon d={P.check} size={12} stroke={3} />
      </button>

      <div className="atl-row-b">
        <div className="atl-row-t">{task.titre}</div>

        <div className="atl-row-m">
          <span className="atl-chip pri">{pri.label}</span>

          {task.client && <span className="atl-chip">{task.client}</span>}
          {task.ref && <span className="atl-chip ref">{task.ref}</span>}
          {stage && <span className="atl-chip">{stage.ic} {stage.label}</span>}

          {due && (
            <span className={`atl-chip${due.late ? ' late' : due.today ? ' today' : ''}`}>
              {due.late ? '⚠ ' : ''}{due.text}
            </span>
          )}

          {task.montant_da ? (
            <span className="atl-chip">{task.montant_da.toLocaleString('fr-DZ')} DA</span>
          ) : null}

          {task.needs_review && <span className="atl-chip review">à vérifier</span>}
        </div>
      </div>

      <div className="atl-row-a">
        {!task.done && (
          <button className="atl-ia" onClick={stop(() => onSnooze(nextWorkday(task.due_date)))}
                  title="Reporter au prochain jour ouvré" aria-label="Reporter au prochain jour ouvré">
            <Icon d={P.tomorrow} size={15} />
          </button>
        )}
        <a className="atl-ia wa" href={`https://wa.me/${WA}?text=${waText}`}
           target="_blank" rel="noopener noreferrer"
           onClick={e => e.stopPropagation()}
           title="Ouvrir WhatsApp" aria-label="Ouvrir WhatsApp">
          <Icon d={P.wa} size={15} />
        </a>
      </div>
    </div>
  )
}
