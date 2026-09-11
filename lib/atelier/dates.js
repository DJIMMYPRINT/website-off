// Date helpers for the atelier workspace.
//
// One rule drives everything here: the Algerian business week runs
// Sunday → Thursday, with Friday and Saturday as the weekend. Every JS date
// utility assumes Monday-first (or Sunday-first, for the US), so the week
// grid, the "prochain jour ouvré" logic and the calendar header all have to
// be built rather than borrowed.
//
// Dates are handled as `YYYY-MM-DD` strings in the site's local timezone,
// never as Date objects passed around. `new Date('2026-09-11')` parses as
// UTC midnight and shifts a day backwards west of Greenwich — the exact bug
// that makes a task land on the wrong column of the calendar.

/** Local-timezone day key. Never use toISOString() for this. */
export function dayKey(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Parse a `YYYY-MM-DD` key back to a local-midnight Date. */
export function fromKey(key) {
  const [y, m, d] = String(key || '').split('-').map(Number)
  if (!y || !m || !d) return new Date()
  return new Date(y, m - 1, d)
}

export function addDays(key, n) {
  const d = fromKey(key)
  d.setDate(d.getDate() + n)
  return dayKey(d)
}

export const TODAY = () => dayKey()

/** Signed day distance from today. Negative = past. */
export function daysFromToday(key) {
  const a = fromKey(key), b = fromKey(TODAY())
  return Math.round((a - b) / 86400000)
}

// Sunday-first, because that is when the week starts here.
export const WEEKDAYS = ['D', 'L', 'M', 'M', 'J', 'V', 'S']
export const WEEKDAYS_LONG = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']

/** Friday (5) and Saturday (6) are the weekend in Algeria. */
export function isWeekend(key) {
  const d = fromKey(key).getDay()
  return d === 5 || d === 6
}

/** The Sunday that opens the business week containing `key`. */
export function weekStart(key) {
  const d = fromKey(key)
  d.setDate(d.getDate() - d.getDay())
  return dayKey(d)
}

/** The seven day keys of that week, Sunday → Saturday. */
export function weekDays(key) {
  const s = weekStart(key)
  return Array.from({ length: 7 }, (_, i) => addDays(s, i))
}

/** Next working day: skips Friday and Saturday. */
export function nextWorkday(key = TODAY()) {
  let next = addDays(key, 1)
  while (isWeekend(next)) next = addDays(next, 1)
  return next
}

const MONTHS = ['janvier','février','mars','avril','mai','juin',
                'juillet','août','septembre','octobre','novembre','décembre']

export function monthName(key) { return MONTHS[fromKey(key).getMonth()] }

/** "Aujourd'hui", "Demain", "Hier", else "dim. 13 septembre". */
export function humanDay(key) {
  const delta = daysFromToday(key)
  if (delta === 0) return "Aujourd'hui"
  if (delta === 1) return 'Demain'
  if (delta === -1) return 'Hier'
  const d = fromKey(key)
  return `${WEEKDAYS_LONG[d.getDay()].slice(0, 3).toLowerCase()}. ${d.getDate()} ${MONTHS[d.getMonth()]}`
}

/** Short relative phrase used on task rows: "en retard de 3 j", "dans 2 j". */
export function relativeDue(key) {
  if (!key) return null
  const delta = daysFromToday(key)
  if (delta < -1) return { text: `en retard de ${-delta} j`, late: true }
  if (delta === -1) return { text: 'en retard d’un jour', late: true }
  if (delta === 0) return { text: "aujourd'hui", late: false, today: true }
  if (delta === 1) return { text: 'demain', late: false }
  if (delta <= 7) return { text: `dans ${delta} j`, late: false }
  return { text: humanDay(key), late: false }
}

/** Calendar grid for the month containing `key`, padded to whole weeks. */
export function monthGrid(key) {
  const d = fromKey(key)
  const first = new Date(d.getFullYear(), d.getMonth(), 1)
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0)
  const cells = []
  for (let i = first.getDay(); i > 0; i--) cells.push({ key: addDays(dayKey(first), -i), out: true })
  for (let i = 1; i <= last.getDate(); i++) cells.push({ key: dayKey(new Date(d.getFullYear(), d.getMonth(), i)), out: false })
  while (cells.length % 7) cells.push({ key: addDays(cells[cells.length - 1].key, 1), out: true })
  return cells
}
