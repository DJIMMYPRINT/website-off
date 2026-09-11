// The shape the agent must return, and the guards that keep bad output from
// reaching the checklist.
//
// The schema below is sent to Claude as a structured-output format, so the
// response is machine-valid by construction. What it cannot guarantee is
// that the *content* is right — a mumbled sentence can still produce a
// confident-looking task attached to the wrong order. That is what the
// confidence threshold and the review queue are for.

import { ORDER_STAGES } from '../constants'

export const STAGE_KEYS = ORDER_STAGES.map(s => s.key)

export const ACTION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['actions', 'resume'],
  properties: {
    resume: {
      type: 'string',
      description: "Une phrase, en français, résumant ce que le vocal contenait. Jamais vide.",
    },
    actions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['type', 'titre', 'client', 'ref', 'statut_commande',
                   'due_date', 'montant_da', 'confiance', 'extrait'],
        properties: {
          type: {
            type: 'string',
            enum: ['tache', 'note', 'maj_commande'],
            description: "tache = quelque chose à faire ; note = information à garder ; maj_commande = l'étape d'une commande existante a changé.",
          },
          titre: {
            type: 'string',
            description: "Formulé à l'impératif et court (max 70 caractères). Ex: « Rappeler Karim pour confirmer les tailles ».",
          },
          client: { type: ['string', 'null'], description: 'Nom du client ou de la société, tel que prononcé. null si absent.' },
          ref: {
            type: ['string', 'null'],
            description: "Référence de commande au format DP-XXXXXX si elle est citée OU si le contexte la désigne sans ambiguïté. null sinon — ne jamais inventer.",
          },
          statut_commande: {
            type: ['string', 'null'],
            enum: [...STAGE_KEYS, null],
            description: "Étape de production concernée. null si la note ne concerne aucune commande.",
          },
          due_date: {
            type: ['string', 'null'],
            description: "Échéance au format YYYY-MM-DD, résolue à partir de la date du jour fournie (« jeudi », « après-demain »…). null si aucune échéance n'est exprimée.",
          },
          montant_da: { type: ['number', 'null'], description: 'Montant en dinars algériens si cité. null sinon.' },
          confiance: { type: 'number', description: 'Entre 0 et 1. Bas si la transcription est confuse ou si le rattachement est incertain.' },
          extrait: { type: 'string', description: 'Le fragment de transcription qui justifie cette action, cité mot pour mot.' },
        },
      },
    },
  },
}

/** Below this, an action goes to the review queue instead of the checklist. */
export const REVIEW_THRESHOLD = 0.6

const uid = () =>
  `t_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`

/**
 * Turn one agent action into a stored task. Everything is re-validated here:
 * the model is an untrusted source like any other input, and a bad enum or a
 * malformed date would otherwise poison the calendar.
 */
export function toTask(action, { noteId, fallbackDay }) {
  const stage = STAGE_KEYS.includes(action?.statut_commande) ? action.statut_commande : null
  const ref = /^DP-[A-Z0-9]{4,12}$/.test(String(action?.ref || '').toUpperCase())
    ? String(action.ref).toUpperCase()
    : null
  const due = /^\d{4}-\d{2}-\d{2}$/.test(String(action?.due_date || ''))
    ? action.due_date
    : null
  const confiance = Math.max(0, Math.min(1, Number(action?.confiance ?? 0)))

  return {
    id: uid(),
    note_id: noteId || null,
    type: ['tache', 'note', 'maj_commande'].includes(action?.type) ? action.type : 'note',
    titre: String(action?.titre || '').trim().slice(0, 140) || 'Note sans titre',
    client: action?.client ? String(action.client).trim().slice(0, 80) : null,
    ref,
    statut_commande: stage,
    // A task with no stated deadline belongs to the day it was dictated,
    // otherwise it never appears on any day's list.
    due_date: due || fallbackDay || null,
    dated: Boolean(due),
    montant_da: Number.isFinite(Number(action?.montant_da)) ? Number(action.montant_da) : null,
    confiance,
    extrait: String(action?.extrait || '').slice(0, 300),
    needs_review: confiance < REVIEW_THRESHOLD,
    done: false,
    done_at: null,
    created_at: new Date().toISOString(),
  }
}

/** System prompt for the structuring pass. */
export function systemPrompt({ today, dayName, orders }) {
  const openOrders = (orders || []).length
    ? (orders || []).map(o =>
        `- ${o.ref} · ${o.client || 'client non nommé'} · étape « ${o.stage} »` +
        (o.total ? ` · ${o.total} DA` : '')).join('\n')
    : '(aucune commande ouverte connue)'

  return `Tu assistes le gérant de Djimmy Prints, imprimeur B2B d'uniformes et de tenues de travail à Aïn Bénian, Alger. Il te dicte ses notes de terrain entre deux rendez-vous, en français mêlé d'arabe algérien.

Ta tâche : transformer sa dictée en actions exploitables. Tu extrais des faits, tu ne hiérarchises pas — le classement par priorité est calculé ailleurs.

Contexte :
- Date du jour : ${today} (${dayName}).
- La semaine ouvrée va du dimanche au jeudi. Vendredi et samedi sont le week-end : si une échéance tombe dessus, garde la date telle quelle, ne la déplace pas de toi-même.
- Commandes actuellement ouvertes :
${openOrders}

Règles :
1. Une intention = une action. « Rappeler Karim et préparer le devis de l'hôtel » fait deux actions.
2. Rattache une action à une référence DP- uniquement si elle est citée, ou si le client nommé correspond sans ambiguïté à une seule commande ouverte ci-dessus. Dans le doute, ref = null et confiance basse.
3. N'invente jamais une référence, un montant ou une date. Ce qui n'est pas dit vaut null.
4. Résous les dates relatives (« jeudi », « après-demain », « la semaine prochaine ») à partir de la date du jour.
5. Les titres sont à l'impératif, courts, et utilisent le vocabulaire du métier : broderie, sérigraphie, transfert numérique, sublimation, flocage, devis, bon de livraison, wilaya.
6. Si la transcription est inaudible ou vide, renvoie un tableau d'actions vide et dis-le dans le résumé.
7. Baisse la confiance dès que tu devines : nom mal transcrit, montant ambigu, rattachement incertain.`
}
