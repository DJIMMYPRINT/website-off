// Persistance serveur des tâches de l'atelier.
//
// Même projet Supabase (`dp-erp`) et même discipline que le suivi de
// commande : les tables vivent dans le schéma `site`, jamais dans `public`
// — ce dernier appartient à Prisma côté ERP, et une table ajoutée là
// dériverait ou disparaîtrait à la prochaine migration. PostgREST n'expose
// que `public`, donc l'accès passe par des fonctions SECURITY DEFINER dont
// l'exécution n'est accordée qu'à `service_role`.
//
// Le schéma SQL correspondant est dans scripts/atelier-schema.sql.

import { rpc, dbConfigured } from '../db'

export { dbConfigured }

export function createTask(task) {
  return rpc('site_task_create', {
    p_id: task.id,
    p_note_id: task.note_id || null,
    p_type: task.type,
    p_titre: task.titre,
    p_client: task.client || null,
    p_ref: task.ref || null,
    p_statut: task.statut_commande || null,
    p_due_date: task.due_date || null,
    p_montant: task.montant_da == null ? null : Math.round(Number(task.montant_da)),
    p_confiance: Number(task.confiance) || 0,
    p_extrait: task.extrait || null,
    p_needs_review: Boolean(task.needs_review),
  })
}

/** Toutes les tâches ouvertes, plus celles cochées récemment. */
export function listTasks({ since = null } = {}) {
  return rpc('site_tasks_list', { p_since: since })
}

export function updateTask(id, patch) {
  return rpc('site_task_update', {
    p_id: id,
    p_done: typeof patch.done === 'boolean' ? patch.done : null,
    p_due_date: patch.due_date === undefined ? null : patch.due_date,
    p_titre: patch.titre === undefined ? null : patch.titre,
    p_needs_review: typeof patch.needs_review === 'boolean' ? patch.needs_review : null,
  })
}

export function deleteTask(id) {
  return rpc('site_task_delete', { p_id: id })
}

export function createNote(note) {
  return rpc('site_note_create', {
    p_id: note.id,
    p_transcript: note.transcript || '',
    p_resume: note.resume || null,
  })
}
