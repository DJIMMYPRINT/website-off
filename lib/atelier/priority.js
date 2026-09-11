// Deterministic priority ranking.
//
// The agent extracts facts; it does not decide what matters. Ranking lives
// here, in ordinary code, for two reasons: a model asked to rank the same
// list twice will not agree with itself, and when you disagree with the
// order you need somewhere to go and change it. That somewhere is this file.
//
// Score = production stage + deadline pressure + order size. Thresholds at
// the bottom turn the score into one of four buckets.

import { daysFromToday } from './dates'

export const PRIORITIES = {
  P1: { key: 'P1', label: 'Urgent',    short: 'Urgent',    tone: 'crit' },
  P2: { key: 'P2', label: 'À traiter', short: 'À traiter', tone: 'warn' },
  P3: { key: 'P3', label: 'Planifié',  short: 'Planifié',  tone: 'ok'   },
  P4: { key: 'P4', label: 'Pour info', short: 'Info',      tone: 'idle' },
}

export const PRIORITY_ORDER = ['P1', 'P2', 'P3', 'P4']

// How much pressure each production stage carries on its own. A job already
// on the press or with the carrier is money in motion; a request that has
// only just landed can wait an afternoon.
const STAGE_WEIGHT = {
  production: 3,
  expediee:   3,
  confirmee:  2,
  recue:      1,
  livree:     0,
}

// An order at or above this many dinars gets one extra point: losing a
// 100 000 DA account over a missed callback costs more than a small one.
const BIG_ORDER_DA = 100000

export function scoreTask(task) {
  if (!task || task.done) return { score: 0, priority: 'P4', reasons: [] }

  const reasons = []
  let score = 0

  const stage = STAGE_WEIGHT[task.statut_commande]
  if (stage) {
    score += stage
    reasons.push(stage >= 3 ? 'commande en cours de traitement' : 'commande engagée')
  }

  if (task.due_date) {
    const delta = daysFromToday(task.due_date)
    if (delta < 0)       { score += 3; reasons.push('échéance dépassée') }
    else if (delta === 0){ score += 2; reasons.push("échéance aujourd'hui") }
    else if (delta <= 2) { score += 1; reasons.push('échéance sous 48 h') }
  }

  if (Number(task.montant_da) >= BIG_ORDER_DA) {
    score += 1
    reasons.push('montant important')
  }

  const priority =
    score >= 5 ? 'P1' :
    score >= 3 ? 'P2' :
    score >= 1 ? 'P3' : 'P4'

  return { score, priority, reasons }
}

/** Attach `priority`, `score` and `reasons` to a task without mutating it. */
export function rank(task) {
  return { ...task, ...scoreTask(task) }
}

/**
 * Sort for display: open before done, then priority, then the nearest
 * deadline, then newest. Tasks without a deadline sort after those with one
 * at the same priority — a dated commitment outranks a floating intention.
 */
export function sortTasks(tasks) {
  return [...tasks].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1
    const pa = PRIORITY_ORDER.indexOf(a.priority), pb = PRIORITY_ORDER.indexOf(b.priority)
    if (pa !== pb) return pa - pb
    if (a.due_date && b.due_date && a.due_date !== b.due_date) return a.due_date < b.due_date ? -1 : 1
    if (a.due_date && !b.due_date) return -1
    if (!a.due_date && b.due_date) return 1
    return String(b.created_at || '').localeCompare(String(a.created_at || ''))
  })
}

/** Counts per priority bucket, for the stat tiles and the week strip. */
export function tally(tasks) {
  const out = { P1: 0, P2: 0, P3: 0, P4: 0, done: 0, open: 0, total: tasks.length }
  for (const t of tasks) {
    if (t.done) { out.done++; continue }
    out.open++
    out[t.priority] = (out[t.priority] || 0) + 1
  }
  return out
}
