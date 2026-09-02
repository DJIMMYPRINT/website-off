# Réponses automatiques sur les réseaux sociaux

Objectif : ne plus laisser un message sans réponse sur **WhatsApp, Messenger
et Instagram**, sans rien payer.

Il y a deux façons de faire, et elles se complètent — commencez par la 1,
elle prend 20 minutes et ne demande aucun code. La 2 est le bot livré avec ce
dépôt, qui répond avec **vos vrais prix** et **vos vraies règles**.

---

## 1. Ce qui existe déjà, gratuitement, sans code

### Meta Business Suite (Facebook + Instagram) — gratuit, inclus

Sur [business.facebook.com](https://business.facebook.com) →
**Boîte de réception → Automatisations** :

| Automatisation | Ce qu'elle fait |
|---|---|
| Réponse instantanée | Message envoyé automatiquement au tout premier message |
| Message d'absence | Réponse hors horaires (à régler sur dim.–jeu. 8h–18h, ven. 8h–12h) |
| Questions fréquentes | Jusqu'à 4 questions cliquables avec leur réponse |
| Réponse aux commentaires | Répond en commentaire et/ou en privé sous vos publications |
| Mots-clés | Réponse déclenchée par un mot précis (« prix », « catalogue »…) |

C'est **le meilleur rapport effort/résultat**, et c'est la seule solution qui
répond aussi aux **commentaires** sous les publications — ce que le bot du §2
ne fait pas.

### Application WhatsApp Business — gratuite

Dans l'app (Réglages → Outils de l'entreprise) :

- **Message d'accueil** : envoyé au premier contact.
- **Message d'absence** : envoyé hors horaires.
- **Réponses rapides** : vous tapez `/prix` et le texte complet s'insère.
- **Catalogue** : vos produits avec photos et prix, directement dans WhatsApp.

Limite : ces messages sont **fixes**. Ils ne savent pas répondre « le polo est
à 1 200 DA » quand on demande le prix du polo.

### Ce que ces outils ne savent pas faire

- Donner un prix précis par produit, et appliquer la remise volume.
- Reconnaître une référence `DP-XXXXXX` et parler du suivi.
- Comprendre la darija écrite en lettres latines (« chhal », « kadech »).
- Utiliser **le même jeu de réponses** sur les trois canaux.

C'est exactement ce que fait le bot ci-dessous.

---

## 2. Le bot du site (dans ce dépôt)

Trois fichiers, aucune dépendance ajoutée, aucun serveur à louer :

| Fichier | Rôle |
|---|---|
| `lib/autoreply.js` | Le cerveau : mots-clés → réponse. Lit les prix dans `lib/products.js` et les règles dans `lib/constants.js`, donc **une réponse ne peut pas contredire le site**. |
| `pages/api/social/webhook.js` | L'oreille : reçoit les messages Meta (Messenger, Instagram, WhatsApp) et envoie la réponse. |
| `pages/bot.js` | Le banc d'essai : `https://djimmyprints.xyz/bot` (page interne, non référencée). |

### Ce qu'il sait traiter

Prix (global ou par produit) · catalogue · minimum de commande · remises
volume · délais · livraison · paiement · techniques de marquage · format du
logo · échantillons · contrats annuels · devis · comment commander ·
horaires · adresse · coordonnées · suivi et référence `DP-XXXXXX` ·
salutations et remerciements · demande de parler à un humain.

Tout le reste reçoit une réponse honnête (« je n'ai pas su répondre, je
transmets ») marquée **à reprendre par un humain** — le bot n'invente jamais
un prix ou un délai.

Chaque réponse se termine par `🤖 Réponse automatique · Djimmy Prints`, et
indique si l'atelier est ouvert ou à quelle heure un humain répondra.

### Le tester tout de suite, sans rien brancher

- Page de test : **`/bot`** (tapez un message comme un client le ferait).
- En ligne de commande :

```bash
curl "https://djimmyprints.xyz/api/social/preview?text=chhal%20le%20polo"
```

### Combien ça coûte

| Poste | Coût |
|---|---|
| Hébergement | 0 DA — le webhook tourne dans le site Next.js déjà déployé sur Vercel |
| Messenger / Instagram | Gratuit |
| WhatsApp Cloud API | Les conversations **initiées par le client** (service) sont gratuites. Seuls les messages *modèles* envoyés par l'entreprise (marketing, relances) sont facturés — le bot n'en envoie aucun. |

> Les paliers gratuits des plateformes changent : vérifiez la page tarifaire
> Meta avant de compter dessus pour un gros volume.

---

## 3. Brancher le bot sur vos comptes

### Étape 1 — Créer l'application Meta

1. [developers.facebook.com](https://developers.facebook.com) → *Mes applications* → **Créer une application** → type **Entreprise**.
2. Ajoutez les produits dont vous avez besoin : **Messenger**, **Instagram**, **WhatsApp**.

### Étape 2 — Récupérer les jetons

- **Messenger** : produit Messenger → *Paramètres* → sélectionnez la Page → **Générer un jeton** (jeton d'accès de Page).
- **Instagram** : le compte Instagram doit être **professionnel** et **lié à la Page Facebook**. Le jeton de Page suffit alors.
- **WhatsApp** : produit WhatsApp → *Configuration de l'API* → notez le **jeton d'accès** et l'**identifiant du numéro de téléphone** (`phone_number_id`).

Permissions à demander : `pages_messaging`, `pages_manage_metadata`,
`instagram_manage_messages`, `whatsapp_business_messaging`.

### Étape 3 — Déclarer les variables sur Vercel

*Project → Settings → Environment Variables*, puis **redéployez** (les
variables ne sont lues qu'au déploiement) :

| Variable | Obligatoire | Valeur |
|---|---|---|
| `META_VERIFY_TOKEN` | oui | Une phrase que vous inventez (ex. `djimmy-2026-verif`). À retaper à l'identique côté Meta. |
| `META_APP_SECRET` | fortement conseillé | *Paramètres → Général → Clé secrète de l'application*. Sans elle, la signature des messages entrants n'est pas vérifiée. |
| `META_PAGE_TOKEN` | pour Messenger / Instagram | Jeton d'accès de Page |
| `META_IG_TOKEN` | non | Seulement si le compte Instagram utilise un jeton distinct |
| `WHATSAPP_TOKEN` | pour WhatsApp | Jeton d'accès WhatsApp |
| `WHATSAPP_PHONE_ID` | pour WhatsApp | Identifiant du numéro de téléphone |
| `AUTOREPLY_ENABLED` | non | `false` coupe toutes les réponses sans toucher au code |
| `META_GRAPH_VERSION` | non | Par défaut `v21.0` |

Tant qu'un jeton manque, le canal correspondant est simplement **inerte** :
le webhook répond `200`, écrit dans les logs la réponse qu'il aurait envoyée,
et n'envoie rien. Rien ne casse.

### Étape 4 — Déclarer le webhook côté Meta

Dans chaque produit (Messenger, Instagram, WhatsApp) → **Webhooks** :

- **URL de rappel** : `https://djimmyprints.xyz/api/social/webhook`
- **Jeton de vérification** : la valeur de `META_VERIFY_TOKEN`
- **Champs à souscrire** : `messages` (et `messaging_postbacks` pour Messenger)

Meta appelle l'URL en `GET` pour la vérifier ; elle doit répondre
immédiatement. Vous pouvez le tester vous-même :

```bash
curl "https://djimmyprints.xyz/api/social/webhook?hub.mode=subscribe&hub.verify_token=VOTRE_TOKEN&hub.challenge=42"
# doit afficher : 42
```

Enfin, **abonnez la Page à l'application** (Messenger → Paramètres →
*Webhooks* → sélectionner la Page).

### Étape 5 — Passer en production

Tant que l'application est en mode **Développement**, seuls les
administrateurs et testeurs déclarés reçoivent les réponses. Pour tous vos
clients : passez l'application en **Live** et faites valider les permissions
(*App Review*). Comptez quelques jours de vérification côté Meta.

---

## 4. Modifier les réponses

Tout est dans **`lib/autoreply.js`**, dans le tableau `RULES` :

```js
{
  intent: 'garantie',
  label: 'Garantie',
  keywords: ['garantie', 'garanti', 'defaut', 'echange', 'retour'],
  handoff: true,                 // marque « à reprendre par un humain »
  reply: () => 'Nos marquages sont garantis...',
}
```

- Ajouter un mot-clé : complétez `keywords` (en minuscules, sans accents —
  le texte reçu est normalisé avant comparaison).
- Ajouter une réponse : copiez un bloc au-dessus.
- Changer un prix : **ne touchez pas à ce fichier**, éditez `lib/products.js`.
  Le bot lit le catalogue.
- Vérifiez ensuite sur `/bot`, puis `npm run build` avant de déployer.

---

## 5. Garde-fous en place

- **Signature vérifiée** (`X-Hub-Signature-256`) : un tiers ne peut pas faire
  parler le bot en imitant Meta, dès lors que `META_APP_SECRET` est défini.
- **Anti-doublon** : un même message n'est traité qu'une fois (Meta réessaie
  en cas d'erreur).
- **Quota** : 12 réponses maximum par interlocuteur et par heure — évite
  qu'un bot en face déclenche une boucle infinie.
- **Échos ignorés** : le bot ne se répond jamais à lui-même.
- **Texte uniquement** : photos, audios et réactions sont laissés à un humain.
- **Interrupteur** : `AUTOREPLY_ENABLED=false` coupe tout.

Ce qu'il ne fait **pas** : répondre aux commentaires publics et aux mentions
en story (utilisez pour cela les automatisations gratuites de Meta Business
Suite, §1), ni envoyer de message en premier.

> Fenêtre des 24 h : Meta n'autorise une réponse libre que dans les 24 heures
> suivant le dernier message du client. Au-delà, seul un message *modèle*
> approuvé passe — donc si le bot ne répond pas à un vieux message, c'est
> normal, pas une panne.

---

## 6. Si vous préférez ne rien héberger

| Outil | Palier gratuit | Remarque |
|---|---|---|
| **Meta Business Suite** | Illimité | Le plus simple, voir §1 |
| **ManyChat** | Oui, limité en contacts | Interface visuelle, Instagram/Messenger ; WhatsApp souvent payant |
| **Chatwoot** (open source) | Gratuit si auto-hébergé | Boîte de réception multi-canal, plutôt un outil d'agent |
| **Typebot / n8n** (open source) | Gratuits si auto-hébergés | Scénarios visuels, mais il faut un serveur — donc plus de travail que le bot déjà présent ici |

Les paliers gratuits de ces services changent régulièrement : vérifiez avant
de vous engager. Le bot de ce dépôt a l'avantage de n'avoir **aucun
intermédiaire** entre vos clients et vous.
