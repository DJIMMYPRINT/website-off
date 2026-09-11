// POST /api/voice/transcribe — audio → texte.
//
// Claude ne transcrit pas l'audio : l'API Messages n'accepte pas d'entrée
// sonore. La transcription passe donc par un point d'entrée compatible
// Whisper (OpenAI `whisper-1`, Groq `whisper-large-v3`, ou toute autre
// implémentation exposant /audio/transcriptions).
//
// Ce choix n'est pas qu'une question de disponibilité : les notes sont
// dictées en français mêlé d'arabe algérien, et c'est précisément là que la
// reconnaissance vocale du navigateur décroche. Whisper gère l'alternance de
// langues ; `webkitSpeechRecognition`, forcé sur une seule locale, non.
//
// L'audio arrive en base64 dans du JSON plutôt qu'en multipart : cela évite
// une dépendance de parsing supplémentaire, au prix d'environ 33 % de volume
// — négligeable pour une note d'une minute en Opus.

const DEFAULT_URL = 'https://api.openai.com/v1/audio/transcriptions'

function clean(v) {
  return String(v || '').trim().replace(/^["']|["']$/g, '')
}

const KEY = clean(process.env.TRANSCRIBE_API_KEY)
const URL_ = clean(process.env.TRANSCRIBE_URL) || DEFAULT_URL
const MODEL = clean(process.env.TRANSCRIBE_MODEL) || 'whisper-1'

export const transcribeConfigured = Boolean(KEY)

// Le vocabulaire du métier, soufflé au modèle. Whisper accepte un « prompt »
// qui biaise son décodage : sans lui, « sérigraphie » ressort en « série
// graphie » et les références DP- en suite de lettres séparées.
const VOCAB = 'Djimmy Prints, broderie, sérigraphie, transfert numérique, sublimation, flocage, ' +
  'polo, tablier, gilet, casquette, chemise, veste, tote bag, ' +
  'devis, bon de livraison, wilaya, Aïn Bénian, Alger, Sétif, Oran, Constantine, ' +
  'référence DP, dinars, pièces.'

export const config = {
  api: {
    // Une minute d'Opus fait ~500 ko, ~670 ko une fois en base64. La limite
    // par défaut de Next (1 mo) couperait une note de deux minutes.
    bodyParser: { sizeLimit: '25mb' },
  },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Méthode non autorisée.' })
  }

  if (!transcribeConfigured) {
    // Comme /api/orders : on dit *pourquoi* ce n'est pas disponible, pour
    // distinguer une variable jamais posée d'une variable posée après le
    // déploiement — seul le second cas demande un redéploiement.
    return res.status(503).json({
      configured: false,
      error: "Transcription non configurée : TRANSCRIBE_API_KEY est absente de cet environnement.",
    })
  }

  const { audio, mimeType } = req.body || {}
  if (typeof audio !== 'string' || audio.length < 100) {
    return res.status(400).json({ error: 'Aucun audio reçu.' })
  }

  let bytes
  try {
    bytes = Buffer.from(audio, 'base64')
  } catch {
    return res.status(400).json({ error: 'Audio illisible.' })
  }
  if (!bytes.length) return res.status(400).json({ error: 'Audio vide.' })

  // L'extension doit correspondre au conteneur réellement enregistré :
  // Chrome Android sort du webm, Safari iOS du mp4, et l'API refuse un
  // fichier dont le nom ment sur son format.
  const type = String(mimeType || 'audio/webm').split(';')[0]
  const ext = type.includes('mp4') ? 'mp4'
    : type.includes('ogg') ? 'ogg'
    : type.includes('mpeg') ? 'mp3'
    : type.includes('wav') ? 'wav'
    : 'webm'

  const form = new FormData()
  form.append('file', new Blob([bytes], { type }), `note.${ext}`)
  form.append('model', MODEL)
  form.append('language', 'fr')
  form.append('prompt', VOCAB)
  form.append('response_format', 'json')

  try {
    const upstream = await fetch(URL_, {
      method: 'POST',
      headers: { Authorization: `Bearer ${KEY}` },
      body: form,
    })

    if (!upstream.ok) {
      const raw = await upstream.text()
      // Le corps de la réponse peut contenir la clé ou l'audio ; seul le
      // statut sort d'ici, le détail reste dans le journal du serveur.
      console.error('[transcribe]', upstream.status, raw.slice(0, 400))
      return res.status(502).json({
        error: "Le service de transcription a refusé l'audio.",
        upstream: upstream.status,
      })
    }

    const data = await upstream.json()
    const text = String(data?.text || '').trim()
    if (!text) return res.status(200).json({ text: '', empty: true })

    return res.status(200).json({ text, model: MODEL })
  } catch (err) {
    console.error('[transcribe]', err)
    return res.status(500).json({ error: 'Transcription indisponible.' })
  }
}
