// Task store for the atelier.
//
// Mirrors how /suivi already works: the device is always the source that
// answers instantly, and the server — when it is configured — is the copy
// that survives a change of phone. Reads come from localStorage so the list
// paints with no spinner; writes go to both, and a server that is absent or
// unreachable degrades the feature to on-device only. It never blocks the UI.

const KEY = 'djimmy_atelier_v1'
const NOTES_KEY = 'djimmy_atelier_notes_v1'

function read(key) {
  if (typeof window === 'undefined') return []
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function write(key, value) {
  if (typeof window === 'undefined') return false
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    // Quota exceeded or storage blocked: the in-memory state stays correct
    // for this session, which is better than throwing inside a click handler.
    return false
  }
}

export const listTasks = () => read(KEY)
export const listNotes = () => read(NOTES_KEY).slice(0, 60)

export function saveTasks(tasks) {
  // Capped: this is a working checklist, not an archive. Done tasks age out
  // first so the open ones are never the ones dropped.
  const open = tasks.filter(t => !t.done)
  const done = tasks.filter(t => t.done)
    .sort((a, b) => String(b.done_at || '').localeCompare(String(a.done_at || '')))
    .slice(0, 200)
  write(KEY, [...open, ...done])
  return tasks
}

export function saveNote(note) {
  write(NOTES_KEY, [note, ...read(NOTES_KEY)].slice(0, 60))
  return note
}

/* ── Server mirror ─────────────────────────────────────────────────────
   Fire-and-forget. Every call resolves to a boolean instead of throwing:
   the caller has already updated the screen, and a failed sync must not
   surface as a red banner over a checklist that is working fine.        */

async function post(url, body, method = 'POST') {
  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    return res.ok
  } catch {
    return false
  }
}

export const pushTask   = (task)      => post('/api/tasks', { task })
export const patchTask  = (id, patch) => post(`/api/tasks/${id}`, patch, 'PATCH')

/** Pull the server's copy and merge it in. Server wins on conflict. */
export async function pullTasks() {
  try {
    const res = await fetch('/api/tasks')
    if (!res.ok) return null
    const data = await res.json()
    if (!data.configured || !Array.isArray(data.tasks)) return null
    const local = listTasks()
    const byId = new Map(local.map(t => [t.id, t]))
    for (const t of data.tasks) byId.set(t.id, { ...byId.get(t.id), ...t })
    const merged = [...byId.values()]
    saveTasks(merged)
    return merged
  } catch {
    return null
  }
}
