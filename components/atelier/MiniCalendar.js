import { useState } from 'react'
import Icon, { P } from './icons'
import {
  monthGrid, monthName, fromKey, dayKey, isWeekend, TODAY, WEEKDAYS,
} from '../../lib/atelier/dates'
import { PRIORITY_ORDER } from '../../lib/atelier/priority'

// Calendrier du mois, en-tête dimanche → samedi.
//
// L'ordre des colonnes n'est pas cosmétique : la semaine ouvrée algérienne
// va du dimanche au jeudi. Un calendrier qui commence le lundi place les
// deux jours de fermeture au milieu de la grille et rend la semaine de
// travail illisible d'un coup d'œil.
//
// Chaque jour porte jusqu'à trois points, dans l'ordre de priorité. Ils
// disent « il y a de la charge ici », pas « combien » — le nombre exact est
// dans la bande de la semaine et dans la liste.

export default function MiniCalendar({ selected, byDay, onSelect }) {
  const [cursor, setCursor] = useState(selected)
  const cells = monthGrid(cursor)
  const today = TODAY()

  const shift = (n) => {
    const d = fromKey(cursor)
    d.setMonth(d.getMonth() + n, 1)
    setCursor(dayKey(d))
  }

  return (
    <div className="atl-card">
      <div className="atl-cal-top">
        <button onClick={() => shift(-1)} aria-label="Mois précédent"><Icon d={P.left} size={14} /></button>
        <b>{monthName(cursor)} {fromKey(cursor).getFullYear()}</b>
        <button onClick={() => shift(1)} aria-label="Mois suivant"><Icon d={P.right} size={14} /></button>
      </div>

      <div className="atl-cal">
        {WEEKDAYS.map((d, i) => (
          <div key={i} className={`hd${i === 5 || i === 6 ? ' we' : ''}`}>{d}</div>
        ))}

        {cells.map(({ key, out }) => {
          const tasks = byDay[key] || []
          // Les trois priorités les plus hautes présentes ce jour-là.
          const dots = PRIORITY_ORDER.filter(p => tasks.some(t => !t.done && t.priority === p)).slice(0, 3)
          const cls = [
            'atl-cd',
            out ? 'out' : '',
            isWeekend(key) ? 'we' : '',
            key === today ? 'today' : '',
            key === selected ? 'sel' : '',
          ].filter(Boolean).join(' ')

          return (
            <button key={key} className={cls} onClick={() => onSelect(key)}
                    aria-label={`${fromKey(key).getDate()} ${monthName(key)}, ${tasks.length} tâche(s)`}
                    aria-current={key === selected ? 'date' : undefined}>
              {fromKey(key).getDate()}
              <span className="ld">
                {dots.map(p => <i key={p} style={{ background: `var(--${p.toLowerCase()})` }} />)}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
