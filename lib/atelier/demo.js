// Seed content for a first visit.
//
// An empty workspace is impossible to judge: you cannot tell whether the
// priority rules are sensible, or whether the calendar reads correctly, from
// a blank column. These five entries exercise every bucket — an overdue job
// in production, a dated quote, a floating note, a low-confidence item bound
// for the review queue — so the first screen shows the tool working.
//
// They are written once, on first load, and clearing them is permanent.

import { TODAY, addDays, nextWorkday } from './dates'

export const DEMO_FLAG = 'djimmy_atelier_seeded_v1'

export function demoTasks() {
  const today = TODAY()
  const base = { note_id: null, done: false, done_at: null, dated: true, needs_review: false }
  const stamp = (n) => new Date(Date.now() - n * 3600000).toISOString()

  return [
    { ...base, id: 't_demo1', type: 'tache', titre: 'Rappeler Karim — confirmer les tailles avant lancement',
      client: 'Restaurant El Djazaïr', ref: 'DP-K4M9T2', statut_commande: 'production',
      due_date: addDays(today, -1), montant_da: 144000, confiance: 0.92, created_at: stamp(26),
      extrait: 'il faut rappeler Karim du restaurant pour les tailles, la sérigraphie part demain' },

    { ...base, id: 't_demo2', type: 'tache', titre: 'Envoyer le devis — 80 chemises brodées',
      client: 'Hôtel Riadh', ref: null, statut_commande: 'recue',
      due_date: today, montant_da: 144000, confiance: 0.81, created_at: stamp(20),
      extrait: "l'hôtel Riadh veut quatre-vingts chemises brodées, faut leur envoyer le devis aujourd'hui" },

    { ...base, id: 't_demo3', type: 'maj_commande', titre: 'Remettre les 120 polos au transporteur — wilaya de Sétif',
      client: 'Groupe Amiri', ref: 'DP-P7X2QB', statut_commande: 'expediee',
      due_date: nextWorkday(today), montant_da: 132000, confiance: 0.88, created_at: stamp(6),
      extrait: 'les cent vingt polos partent sur Sétif, faut les donner au transporteur' },

    { ...base, id: 't_demo4', type: 'tache', titre: 'Relancer le fournisseur de fil doré',
      client: null, ref: null, statut_commande: null,
      due_date: addDays(today, 3), montant_da: null, confiance: 0.74, created_at: stamp(4),
      extrait: 'penser à relancer pour le fil doré, il en reste presque plus' },

    { ...base, id: 't_demo5', needs_review: true, type: 'note', titre: 'Vérifier le nom du client — « Bouzid » ou « Bouziane » ?',
      client: 'Bouz…', ref: null, statut_commande: 'confirmee',
      due_date: today, montant_da: null, confiance: 0.38, created_at: stamp(2),
      extrait: 'et puis euh… monsieur Bouz… il a dit qu il rappelle pour les tabliers' },
  ]
}

export function demoNote() {
  return {
    id: 'n_demo1',
    created_at: new Date(Date.now() - 26 * 3600000).toISOString(),
    transcript: "Bon, ce matin… il faut rappeler Karim du restaurant El Djazaïr pour les tailles, la sérigraphie part demain. Après, l'hôtel Riadh veut quatre-vingts chemises brodées, faut leur envoyer le devis aujourd'hui. Les cent vingt polos du groupe Amiri partent sur Sétif, faut les donner au transporteur. Penser à relancer pour le fil doré, il en reste presque plus. Et puis euh… monsieur Bouz… il a dit qu'il rappelle pour les tabliers.",
    resume: 'Cinq points : un rappel client urgent, un devis à envoyer, une expédition à remettre au transporteur, un réapprovisionnement et un contact à confirmer.',
    source: 'démo',
  }
}
