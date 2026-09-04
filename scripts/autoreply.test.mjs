// Tests du moteur de réponses automatiques (lib/autoreply.js).
//
//   npm test
//
// Aucune dépendance : le lanceur de tests intégré à Node (node --test) suffit.
// Ce qui est vérifié ici, c'est l'intention détectée — pas le texte exact des
// réponses, qui doit rester libre de changer. Si vous reformulez un message,
// ces tests continuent de passer ; si vous cassez la détection en retirant un
// mot-clé, ils échouent.

import test from 'node:test'
import assert from 'node:assert/strict'
import { buildReply, matchRule, shouldReply, findRef, isOpenNow, normalizeName } from '../lib/autoreply.js'

// Messages réellement reçus en DM ou en commentaire, écrits comme les clients
// écrivent : français, arabe, derja latinisée, sans accents ni ponctuation.
const CAS = [
  ['Bonjour, chhal el polo brodé pour 60 pièces ?', 'prix'],
  ['c\'est combien le tablier', 'prix'],
  ['9adach t-shirt', 'prix'],
  ['السلام عليكم، بشحال التيشيرت؟', 'prix'],
  ['je voudrais un devis pour 200 t-shirts', 'devis'],
  
  ['Vous faites une seule pièce ?', 'minimum'],
  ['Livraison à Oran ça prend combien de temps ?', 'delai'],
  ['c\'est quoi le délai de production', 'delai'],
  ['vous livrez à Sétif ?', 'livraison'],
  ['vous brodez sur les vestes ?', 'technique'],
  
  ['avez-vous des tabliers de cuisine ?', 'catalogue'],
  ['je veux commander 100 polos', 'commande'],
  ['vous êtes ouverts vendredi ?', 'horaires'],
  ['c\'est où votre atelier ?', 'horaires'],
  ['Où en est ma commande DP-4KQ8ZT ?', 'suivi'],
  ['Salam', 'salutation'],
  ['bonjour', 'salutation'],
  ['merci beaucoup 🙏', 'remerciement'],
  ['azertyuiop', 'defaut'],
]

test('chaque message type tombe sur la bonne règle', () => {
  for (const [message, attendu] of CAS) {
    const { intent } = buildReply(message, { channel: 'dm' })
    assert.equal(intent, attendu, `« ${message} » → ${intent} au lieu de ${attendu}`)
  }
})

test('une expression de plusieurs mots l\'emporte sur un mot isolé', () => {
  // « combien de temps » (délai) doit battre « combien » (prix), sinon toute
  // question de délai serait chiffrée comme une demande de tarif.
  assert.equal(matchRule('ça prend combien de temps').rule.key, 'delai')
  assert.equal(matchRule('ça coûte combien').rule.key, 'prix')
})

test('un terme métier précis bat une tournure générique', () => {
  // « je voudrais » / « je veux » (règle commande, deux mots) ne doit pas
  // masquer le mot qui dit vraiment ce que le client demande.
  assert.equal(matchRule('je voudrais un devis').rule.key, 'devis')
  
  assert.equal(matchRule('je veux commander 50 polos').rule.key, 'commande')
})

test('le pluriel est toléré', () => {
  assert.equal(matchRule('vos tarifs svp').rule.key, 'prix')
  assert.equal(matchRule('vous etes ouverts ?').rule.key, 'horaires')
})

test('rien de reconnu → réponse par défaut, jamais une invention', () => {
  const { intent, score, text } = buildReply('xyz abc', { channel: 'dm' })
  assert.equal(intent, 'defaut')
  assert.equal(score, 0)
  assert.match(text, /wa\.me/) // renvoie toujours vers WhatsApp
})

test('le robot se tait quand il n\'y a rien à répondre', () => {
  for (const vide of ['', '   ', '@ami', '🔥🔥🔥', '@page @autre']) {
    assert.equal(shouldReply(vide), false, `« ${vide} » ne devrait pas déclencher de réponse`)
    assert.equal(buildReply(vide, { channel: 'comment' }).skipped, true)
  }
  assert.equal(shouldReply('ok'), true)
})

test('la référence de commande est reconnue sous ses formes courantes', () => {
  assert.equal(findRef('ma commande DP-4KQ8ZT'), 'DP-4KQ8ZT')
  assert.equal(findRef('reference dp 4kq8zt'), 'DP-4KQ8ZT')
  assert.equal(findRef('bonjour, un devis svp'), null)
  // Une référence citée fait passer le suivi devant le reste.
  assert.equal(matchRule('bonjour, prix pour DP-4KQ8ZT').rule.key, 'suivi')
})

test('la réponse publique reste plus courte que le message privé', () => {
  for (const [message] of CAS) {
    const dm = buildReply(message, { channel: 'dm' })
    const commentaire = buildReply(message, { channel: 'comment' })
    if (commentaire.skipped) continue
    assert.ok(
      commentaire.text.length <= dm.text.length,
      `« ${message} » : le commentaire (${commentaire.text.length}) dépasse le DM (${dm.text.length})`,
    )
    // Instagram tronque au-delà de ~2200 caractères.
    assert.ok(commentaire.text.length < 900, `commentaire trop long pour « ${message} »`)
  }
})

test('les horaires suivent la semaine algérienne (dimanche → jeudi)', () => {
  // Heures données en UTC ; l'Algérie est à UTC+1 toute l'année.
  assert.equal(isOpenNow(new Date('2026-09-06T09:00:00Z')), true)  // dimanche 10h
  assert.equal(isOpenNow(new Date('2026-09-06T18:00:00Z')), false) // dimanche 19h
  assert.equal(isOpenNow(new Date('2026-09-04T09:00:00Z')), true)  // vendredi 10h
  assert.equal(isOpenNow(new Date('2026-09-04T12:00:00Z')), false) // vendredi 13h
  assert.equal(isOpenNow(new Date('2026-09-05T09:00:00Z')), false) // samedi : sur RDV
})

test('hors horaires, le message privé le dit — le commentaire public non', () => {
  const nuit = new Date('2026-09-06T23:00:00Z')
  assert.match(buildReply('bonjour', { channel: 'dm', now: nuit }).text, /hors de nos horaires/)
  assert.doesNotMatch(buildReply('bonjour', { channel: 'comment', now: nuit }).text, /hors de nos horaires/)
})

test('un pseudo de réseau social devient une accroche présentable', () => {
  assert.equal(normalizeName('karim.dz_92'), 'Karim')
  assert.equal(normalizeName('🔥🔥'), 'cher client')
  assert.equal(normalizeName(''), 'cher client')
  assert.equal(normalizeName('https://spam.example'), 'cher client')
})

test('aucune entrée ne fait planter le moteur', () => {
  for (const entree of [null, undefined, 12345, '\n\n', 'a'.repeat(5000), '<script>alert(1)</script>']) {
    assert.doesNotThrow(() => buildReply(entree, { channel: 'dm' }))
  }
})
