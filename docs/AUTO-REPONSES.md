# Automatismes réseaux sociaux

Deux automatismes, un seul déploiement, plusieurs comptes :

1. **Réponse aux messages privés** — WhatsApp, Messenger, Instagram DM.
2. **Campagnes « commente un mot → reçois le lien en privé »** — le levier
   d'engagement : chaque commentaire compte pour l'algorithme, et chaque DM
   ouvre une conversation réelle.

Comptes gérés : **Djimmy Prints** (ton commercial, catalogue et prix) et
**Amouri Djameleddine** (marque personnelle : campagnes + relais humain).

---

## 1. Ce qui existe déjà, gratuitement, sans code

### Meta Business Suite (Facebook + Instagram) — gratuit, inclus

Sur [business.facebook.com](https://business.facebook.com) →
**Boîte de réception → Automatisations** : réponse instantanée, message
d'absence, questions fréquentes, réponses aux commentaires, mots-clés.

C'est le meilleur rapport effort/résultat pour démarrer, et cela peut
cohabiter avec le bot ci-dessous. Attention à une chose : si vous activez une
règle Meta sur les mêmes mots-clés que vos campagnes, l'abonné recevra
**deux** réponses. Choisissez : soit Meta, soit le bot, mot-clé par mot-clé.

### Application WhatsApp Business — gratuite

Message d'accueil, message d'absence, réponses rapides (`/prix`), catalogue.
Ces messages sont **fixes** : ils ne savent pas dire « le polo est à
1 200 DA » ni reconnaître une référence `DP-XXXXXX`.

---

## 2. Le bot du site

| Fichier | Rôle |
|---|---|
| `lib/campaigns.js` | **Les comptes et les campagnes** — le fichier à modifier chaque semaine |
| `lib/autoreply.js` | Le répondeur commercial Djimmy Prints (prix, délais, remises…) |
| `pages/api/social/webhook.js` | Webhook Meta : messages *et* commentaires, tous comptes |
| `pages/api/social/preview.js` | Banc d'essai en ligne de commande |
| `pages/bot.js` | Console de test `/bot` — page interne, `noindex`, hors navigation |

Le webhook reconnaît le compte destinataire grâce à l'identifiant envoyé par
Meta (`entry.id`), et utilise **le jeton, les campagnes et le ton de ce
compte**. Un seul déploiement suffit pour les deux marques.

Coût : **0 DA**. Le webhook tourne dans le site Next.js déjà déployé sur
Vercel ; Messenger et Instagram sont gratuits ; sur WhatsApp seules les
conversations initiées par l'entreprise (messages *modèles*) sont facturées,
et le bot n'en envoie aucun.

---

## 3. Campagnes « commente MOT → reçois le lien en DM »

### Comment ça marche

1. En vidéo : *« commente **GUIDE** et je t'envoie ça en privé »*.
2. Un abonné commente `GUIDE`.
3. Le bot répond **publiquement** sous son commentaire
   (« Je viens de te l'envoyer en message privé 📩 »).
4. Le bot lui envoie le **message privé** de la campagne.

Vous récupérez un commentaire, une réponse publique, et une conversation
privée ouverte — les trois signaux que les plateformes valorisent.

### Les deux limites imposées par Meta

> - **Un seul message privé par commentaire.** Jamais deux. Toute la
>   campagne doit tenir dans un message.
> - **7 jours maximum** après le commentaire. Passé ce délai, plus rien ne
>   part — c'est Meta qui bloque, pas le bot.

Conséquences pratiques : un mot-clé **différent par sujet** (sinon vous ne
saurez pas quelle vidéo convertit), et pas de relance automatique. Une vieille
vidéo qui reçoit un commentaire au bout de 8 jours ne déclenchera rien : c'est
normal.

### Créer une campagne

Tout est dans `lib/campaigns.js`, tableau `CAMPAIGNS` :

```js
{
  id: 'tunnel',                       // identifiant court, visible dans les logs
  account: 'amouri',                  // 'amouri' ou 'djimmy'
  keywords: ['TUNNEL', 'TUNEL'],      // prévoyez les fautes de frappe courantes
  media: 'all',                       // ou ['17933258556187263'] pour une seule vidéo
  active: true,                       // false = en pause, sans supprimer
  publicReply: [                      // variantes tirées au hasard
    'Envoyé en privé {prenom} 📩',
    'Regarde tes DM 📩',
  ],
  dm: [                               // assemblé en UN message pour un commentaire
    'Salut {prenom} 👋 Merci pour ton commentaire !',
    'Voici le lien : https://…',
  ],
}
```

- `{prenom}` est remplacé par le prénom ou le pseudo du commentateur.
- `keywords` est insensible aux accents et à la casse : `GUIDE`, `guide` et
  `Guide` déclenchent la même campagne. Le mot doit être **isolé** dans le
  commentaire (« guide » oui, « guidez-moi » non).
- Ajoutez toujours **une ou deux variantes mal orthographiées** du mot-clé :
  c'est ce qui fait la différence sur le volume.

Puis : vérifiez sur **`/bot`** (onglet *Commentaire sous une publication*),
lancez `npm run build`, déployez.

### Cibler une seule vidéo

`media: 'all'` fait vivre la campagne sur **toutes** les publications du
compte — pratique pour un mot-clé permanent (`UNIFORME`, `DEVIS`). Pour un
mot-clé réservé à une vidéo précise, mettez l'identifiant de la publication :

```js
media: ['17933258556187263'],
```

L'identifiant apparaît dans les logs du webhook dès le premier commentaire
reçu sur cette publication (`[social] amouri/instagram commentaire sans
mot-clé …`), ou via l'API Graph (`/me/media`).

### Ce qu'il faut dire en vidéo

> « Commente le mot **GUIDE** — juste le mot — et je t'envoie ça en message
> privé tout de suite. Si tu ne me suis pas encore, abonne-toi, sinon
> Instagram peut bloquer mon message. »

La dernière phrase compte : un compte qui a bloqué les messages de votre page
ne recevra rien, et vous ne pouvez rien y faire.

### Un commentaire sans mot-clé

Le bot **ne répond pas**. Il logue le commentaire et le laisse à un humain :
répondre automatiquement à côté sous une publication publique fait plus de
dégâts qu'un silence.

---

## 4. Brancher les comptes

### Étape 1 — Une application Meta

1. [developers.facebook.com](https://developers.facebook.com) → *Mes applications* → **Créer une application** → type **Entreprise**.
2. Ajoutez les produits : **Messenger**, **Instagram**, et **WhatsApp** si vous l'utilisez.
3. Les deux comptes (Page Djimmy Prints et compte Instagram professionnel de
   la marque personnelle) peuvent vivre dans **la même application** — c'est
   le plus simple. Chaque compte Instagram doit être **professionnel** et
   **lié à une Page Facebook**.

### Étape 2 — Les jetons

- **Page / Messenger** : produit Messenger → *Paramètres* → sélectionnez la Page → **Générer un jeton**.
- **Instagram** : le jeton de la Page liée suffit.
- **WhatsApp** : *Configuration de l'API* → jeton d'accès + `phone_number_id`.

Permissions à demander :

| Permission | Pour quoi |
|---|---|
| `pages_messaging` | Répondre en DM sur Messenger, réponses privées aux commentaires Facebook |
| `pages_manage_engagement` | Répondre publiquement sous un commentaire Facebook |
| `pages_read_engagement` | Recevoir les commentaires de la Page |
| `instagram_manage_messages` | DM Instagram et réponses privées aux commentaires |
| `instagram_manage_comments` | Lire et répondre aux commentaires Instagram |
| `whatsapp_business_messaging` | WhatsApp (facultatif) |

### Étape 3 — Les variables sur Vercel

*Project → Settings → Environment Variables*, puis **redéployez** (les
variables ne sont lues qu'au déploiement) :

| Variable | Obligatoire | Valeur |
|---|---|---|
| `META_VERIFY_TOKEN` | oui | Une phrase que vous inventez (ex. `djimmy-2026-verif`), à retaper à l'identique côté Meta |
| `META_APP_SECRET` | fortement conseillé | *Paramètres → Général → Clé secrète de l'application* |
| `META_PAGE_TOKEN` | oui | Jeton par défaut, utilisé par les comptes sans jeton propre |
| `SOCIAL_IDS_DJIMMY` | dès 2 comptes | Identifiants de la Page **et** du compte Instagram Djimmy Prints, séparés par une virgule |
| `META_TOKEN_DJIMMY` | non | Jeton propre à ce compte (sinon `META_PAGE_TOKEN`) |
| `SOCIAL_IDS_AMOURI` | dès 2 comptes | Identifiants de la Page / compte Instagram de la marque personnelle |
| `META_TOKEN_AMOURI` | oui pour ce compte | Jeton propre à ce compte |
| `WHATSAPP_TOKEN` | pour WhatsApp | Jeton d'accès WhatsApp |
| `WHATSAPP_PHONE_ID` | pour WhatsApp | Identifiant du numéro de téléphone |
| `AUTOREPLY_ENABLED` | non | `false` coupe toutes les réponses |
| `COMMENT_PUBLIC_REPLY` | non | `false` garde le DM mais arrête les réponses publiques |
| `META_GRAPH_VERSION` | non | Par défaut `v21.0` |

> **Tant que `SOCIAL_IDS_*` n'est pas renseigné**, tout ce qui arrive est
> traité comme le premier compte (Djimmy Prints). C'est voulu : avec un seul
> compte branché, rien à configurer. Dès que le deuxième compte arrive, les
> deux `SOCIAL_IDS_*` deviennent nécessaires, sinon la marque personnelle
> répondrait avec le catalogue d'uniformes.

Un identifiant de Page se lit dans *Paramètres de la Page → À propos* ; celui
d'un compte Instagram professionnel s'obtient via l'API Graph
(`/me/accounts?fields=instagram_business_account`) — ou simplement dans les
logs Vercel au premier événement reçu.

### Étape 4 — Le webhook

Dans chaque produit → **Webhooks** :

- **URL de rappel** : `https://djimmyprints.xyz/api/social/webhook`
- **Jeton de vérification** : la valeur de `META_VERIFY_TOKEN`
- **Champs à souscrire** :
  - Messenger : `messages`, `messaging_postbacks`, **`feed`** (commentaires de la Page)
  - Instagram : `messages`, **`comments`**
  - WhatsApp : `messages`

Sans le champ `comments` (Instagram) ou `feed` (Page), **les campagnes ne se
déclenchent jamais** — c'est l'oubli le plus fréquent.

Vérification manuelle :

```bash
curl "https://djimmyprints.xyz/api/social/webhook?hub.mode=subscribe&hub.verify_token=VOTRE_TOKEN&hub.challenge=42"
# doit afficher : 42
```

Enfin, **abonnez chaque Page à l'application** (Messenger → Paramètres → Webhooks → sélectionner la Page).

### Étape 5 — Passer en production

Tant que l'application est en mode **Développement**, seuls les
administrateurs et testeurs déclarés reçoivent les réponses — pratique pour
tester avec votre propre compte. Pour tous vos abonnés : application en
**Live** + validation des permissions (*App Review*).

---

## 5. Tester sans rien envoyer

- Console : **`/bot`** — choisissez le compte, puis *Message privé* ou
  *Commentaire sous une publication*.
- Ligne de commande :

```bash
curl "https://djimmyprints.xyz/api/social/preview?text=chhal%20le%20polo"
curl "https://djimmyprints.xyz/api/social/preview?text=GUIDE&mode=comment&account=amouri"
curl "https://djimmyprints.xyz/api/social/preview"      # comptes, campagnes, intentions
```

**Sans jeton, le webhook est inerte** : il accuse réception, écrit dans les
logs Vercel la réponse qu'il aurait envoyée, et n'envoie rien.

---

## 6. Modifier les réponses commerciales

`lib/autoreply.js`, tableau `RULES` (compte Djimmy Prints uniquement) :

```js
{
  intent: 'garantie',
  label: 'Garantie',
  keywords: ['garantie', 'garanti', 'defaut', 'echange', 'retour'],
  handoff: true,                 // marque « à reprendre par un humain »
  reply: () => 'Nos marquages sont garantis...',
}
```

Pour changer un prix : **ne touchez pas à ce fichier**, éditez
`lib/products.js`. Le bot lit le catalogue.

Le compte personnel n'a volontairement **pas** de répondeur bavard : il livre
la ressource si le mot-clé arrive en DM, sinon il dit qu'il transmet. Un bot
qui improvise au nom d'une personne réelle abîme la marque.

---

## 7. Garde-fous en place

- **Signature vérifiée** (`X-Hub-Signature-256`) dès que `META_APP_SECRET` est défini.
- **Anti-doublon** : un même message ou commentaire n'est traité qu'une fois.
- **Quota** : 12 réponses maximum par interlocuteur et par heure.
- **Nos propres commentaires sont ignorés** : la réponse publique du bot
  revient par le webhook, elle ne doit pas relancer la machine.
- **Pas de réponse publique si le DM a échoué** : promettre un message privé
  qui n'arrive jamais est pire que se taire.
- **Texte uniquement** : photos, audios et réactions restent pour un humain.
- **Interrupteurs** : `AUTOREPLY_ENABLED=false`, `COMMENT_PUBLIC_REPLY=false`.

> Fenêtre des 24 h : Meta n'autorise une réponse libre en DM que dans les
> 24 heures suivant le dernier message de la personne. Au-delà, seul un
> message *modèle* approuvé passe. Un vieux message sans réponse, c'est
> normal, pas une panne.

Ce que le bot ne fait **pas** : envoyer un message en premier, relancer,
répondre aux stories, ni répondre aux commentaires sans mot-clé.

---

## 8. Si vous préférez ne rien héberger

| Outil | Palier gratuit | Remarque |
|---|---|---|
| **Meta Business Suite** | Illimité | Le plus simple, voir §1 |
| **ManyChat** | Oui, limité en contacts | La référence du « commente X → DM » ; WhatsApp souvent payant |
| **Chatwoot** (open source) | Gratuit si auto-hébergé | Boîte multi-canal, plutôt un outil d'agent |
| **Typebot / n8n** (open source) | Gratuits si auto-hébergés | Scénarios visuels, mais il faut un serveur |

Les paliers gratuits changent régulièrement : vérifiez avant de vous engager.
L'avantage du bot de ce dépôt : **aucun intermédiaire** entre vos abonnés et
vous, et aucune limite de contacts.
