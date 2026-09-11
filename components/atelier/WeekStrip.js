import { WEEKDAYS, isWeekend, TODAY, fromKey } from '../../lib/atelier/dates'

// Charge de la semaine : une barre par jour, hauteur = nombre de tâches
// ouvertes. Une seule série, donc une seule teinte — la magnitude se lit
// dans la hauteur, pas dans la couleur. Les jours chargés passent au
// dégradé de marque pour signaler le pic sans introduire une deuxième
// variable de couleur.
//
// Les colonnes du vendredi et du samedi sont estompées : ce sont les jours
// de week-end ici, et une barre haute le vendredi veut dire autre chose
// qu'une barre haute le lundi.

export default function WeekStrip({ days, counts, selected, onSelect }) {
  const max = Math.max(1, ...days.map(d => counts[d] || 0))
  const today = TODAY()

  return (
    <div className="atl-week" role="group" aria-label="Charge de la semaine">
      {days.map(key => {
        const n = counts[key] || 0
        const heavy = n >= Math.max(3, max * 0.75)
        const cls = [
          'atl-wd',
          isWeekend(key) ? 'weekend' : '',
          key === selected ? 'sel' : '',
          key === today ? 'today' : '',
        ].filter(Boolean).join(' ')

        return (
          <button key={key} className={cls} onClick={() => onSelect(key)}
                  aria-label={`${n} tâche${n > 1 ? 's' : ''} le ${key}`}>
            <span className="dn">{WEEKDAYS[fromKey(key).getDay()]}</span>
            <span className="bar">
              {/* Un jour sans rien ne peint aucune barre : un trait vert, même
                  fin, se lit comme « il y a quelque chose ici ». La piste
                  vide suffit à garder la colonne cliquable. */}
              {n > 0 && <span className="fill" style={{ height: `${12 + (n / max) * 88}%` }} />}
            </span>
            <span className="dd">{n || '·'}</span>
          </button>
        )
      })}
    </div>
  )
}
