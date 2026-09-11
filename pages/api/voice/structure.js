// POST /api/voice/structure — transcription → actions structurées.
//
// Un seul appel à Claude, en sortie structurée : le schéma JSON est envoyé
// avec la requête, donc la réponse est valide par construction. Pas de
// « réponds uniquement en JSON » dans le prompt, pas d'extraction par
// expression régulière, pas de boucle de réessai sur erreur de parsing.
//
// Le modèle reçoit aussi les commandes ouvertes : sans ce contexte,
// « rappeler Karim pour les polos » reste une note isolée ; avec, elle se
// rattache à DP-K4M9T2, et la checklist sait de quelle commande elle parle.

import Anthropic from '@anthropic-ai/sdk'
import { ACTION_SCHEMA, systemPrompt } from '../../../lib/atelier/model'
import { WEEKDAYS_LONG, fromKey } from '../../../lib/atelier/dates'

function clean(v) {
  return String(v || '').trim().replace(/^["']|["']$/g, '')
}

const KEY = clean(process.env.ANTHROPIC_API_KEY)
export const agentConfigured = Boolean(KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Méthode non autorisée.' })
  }

  if (!agentConfigured) {
    return res.status(503).json({
      configured: false,
      error: "Agent non configuré : ANTHROPIC_API_KEY est absente de cet environnement.",
    })
  }

  const { transcript, today, orders } = req.body || {}
  const text = String(transcript || '').trim()
  if (!text) return res.status(400).json({ error: 'Transcription vide.' })
  if (text.length > 8000) return res.status(400).json({ error: 'Note trop longue (8 000 caractères max).' })

  const day = /^\d{4}-\d{2}-\d{2}$/.test(String(today)) ? today : null
  if (!day) return res.status(400).json({ error: 'Date du jour manquante ou invalide.' })

  const client = new Anthropic({ apiKey: KEY })

  try {
    const response = await client.messages.create({
      model: 'claude-opus-5',
      max_tokens: 8000,
      // L'extraction est une tâche de lecture, pas de raisonnement long, et
      // le gérant attend devant son écran après avoir parlé : « medium »
      // tient la qualité en divisant la latence. À remonter si les
      // rattachements de commande deviennent approximatifs.
      output_config: {
        effort: 'medium',
        format: { type: 'json_schema', schema: ACTION_SCHEMA },
      },
      system: systemPrompt({
        today: day,
        dayName: WEEKDAYS_LONG[fromKey(day).getDay()],
        orders: Array.isArray(orders) ? orders.slice(0, 40) : [],
      }),
      messages: [{
        role: 'user',
        content: `Voici la dictée, telle que transcrite :\n\n"""\n${text}\n"""`,
      }],
    })

    // Les classificateurs peuvent décliner une requête : statut HTTP 200,
    // mais `content` ne contient alors pas la réponse attendue.
    if (response.stop_reason === 'refusal') {
      return res.status(422).json({
        error: "L'agent a refusé de traiter cette note.",
        category: response.stop_details?.category || null,
      })
    }

    const block = response.content.find(b => b.type === 'text')
    if (!block) return res.status(502).json({ error: "Réponse de l'agent vide." })

    let parsed
    try {
      parsed = JSON.parse(block.text)
    } catch {
      console.error('[structure] JSON invalide malgré le schéma:', block.text.slice(0, 400))
      return res.status(502).json({ error: "Réponse de l'agent illisible." })
    }

    return res.status(200).json({
      configured: true,
      resume: String(parsed?.resume || '').trim(),
      actions: Array.isArray(parsed?.actions) ? parsed.actions : [],
      usage: {
        in: response.usage?.input_tokens ?? null,
        out: response.usage?.output_tokens ?? null,
      },
    })
  } catch (err) {
    console.error('[structure]', err)
    if (err instanceof Anthropic.AuthenticationError) {
      return res.status(502).json({ error: "Clé d'API refusée par Anthropic." })
    }
    if (err instanceof Anthropic.RateLimitError) {
      return res.status(429).json({ error: 'Trop de requêtes. Réessayez dans un instant.' })
    }
    if (err instanceof Anthropic.APIError) {
      return res.status(502).json({ error: `Agent indisponible (${err.status}).` })
    }
    return res.status(500).json({ error: 'Agent indisponible.' })
  }
}
