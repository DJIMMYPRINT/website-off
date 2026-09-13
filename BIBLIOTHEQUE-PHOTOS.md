# Bibliothèque photos — `/photos`

Une page privée où les photos produit arrivent, se rangent toutes seules, et
se retrouvent en deux secondes pour être envoyées à un client.

C'est le complément du raccourci iOS (`RACCOURCI-PHOTOS.md`) : le raccourci
range la galerie du téléphone, la bibliothèque constitue le catalogue de
travail. Les deux partagent le même classement (`lib/classify.js`), donc ils
ne peuvent pas diverger.

Ce que l'app apporte en plus du raccourci :

- la **recherche** (« jaune », « col », « réfléchissant ») — chaque photo
  reçoit une description à l'arrivée ;
- le bouton **Envoyer**, qui ouvre la feuille de partage iPhone et dépose la
  photo directement dans une conversation WhatsApp ;
- la **correction** d'un classement raté, en deux touches ;
- l'accès depuis l'ordinateur autant que depuis le téléphone.

---

## Étape 1 — Les variables (sur Vercel)

En plus de `ANTHROPIC_API_KEY` (déjà posée pour le raccourci) :

| Nom | Valeur |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | la clé `service_role` du projet **dp-erp** |
| `PHOTOS_PASSWORD` | un mot de passe long, à toi |

La clé `service_role` se prend sur supabase.com → projet **dp-erp** →
*Project Settings* → *API Keys*.

> Ne jamais la préfixer par `NEXT_PUBLIC_`. Elle contourne toutes les
> protections de la base et ne doit jamais atteindre un navigateur — elle
> n'est lue que côté serveur, dans `lib/db.js`.

Puis **redéployer**.

La base est déjà prête : la table, les fonctions et le bucket privé
`catalogue-photos` ont été créés par migration.

---

## Étape 2 — S'en servir

Aller sur **djimmyprints.xyz/photos**, entrer le mot de passe. La connexion
tient 30 jours, donc c'est une fois par mois, pas à chaque visite.

Sur iPhone, le plus pratique : bouton *Partager* de Safari → **Sur l'écran
d'accueil**. La bibliothèque devient une icône, comme une vraie app.

**Ajouter :** bouton *Ajouter des photos* → choisir dans la photothèque (on
peut en sélectionner plusieurs). Chaque photo part une par une au classement
et la liste montre dans quel album elle a atterri.

**Retrouver :** taper dans la barre de recherche, ou toucher un album.

**Envoyer :** toucher une photo → **Envoyer** → WhatsApp dans la liste de
partage. La photo part en pièce jointe, pas en lien.

**Corriger :** toucher une photo → changer l'album dans le menu déroulant.
La correction est immédiate.

---

## Ce que fait le navigateur avant l'envoi

Chaque photo est réduite à 1600 px et ré-encodée en JPEG **avant** de quitter
le téléphone. Ça règle trois choses d'un coup :

- le poids (l'API refuse au-delà de 4 Mo) ;
- le coût du classement (une image plus petite = moins de jetons) ;
- le **HEIC** de l'iPhone, que l'API ne sait pas lire mais que Safari sait
  décoder — le canvas le ressort en JPEG.

C'est pour ça que l'app n'a pas le problème de conversion que le raccourci a.

---

## Sécurité

- **Le bucket est privé.** Les photos ne sortent que par URL signée valable
  une heure, générée côté serveur. Une URL qui traîne dans un historique
  WhatsApp cesse de fonctionner.
- **La page n'est jamais en accès libre.** Sans `PHOTOS_PASSWORD`, elle
  répond 503 et refuse toute connexion, plutôt que de s'ouvrir à tous.
- **Le cookie ne contient pas le mot de passe**, seulement une date
  d'expiration et sa signature. Il n'est pas forgeable.
- **Aucune clé Supabase n'atteint le navigateur.** Tout passe par
  `/api/photos`.
- `<meta name="robots" content="noindex">` : la page ne remonte pas dans
  Google.

---

## Ce que ça coûte

Le même tarif que le raccourci, puisque c'est le même classement :
environ **1 centime de dollar par photo** avec Claude Opus 5, divisé par
cinq avec `CLASSIFY_MODEL=claude-haiku-4-5`.

Le stockage Supabase est négligeable à cette échelle : à 1600 px, une photo
pèse autour de 300 Ko, donc le palier gratuit tient plusieurs milliers de
photos.

---

## Limites connues

- **Vidéos : pas encore.** Le classement travaille sur des images. Même
  limite que le raccourci.
- **Un seul mot de passe, pas de comptes.** Suffisant pour une personne ;
  à revoir le jour où un employé doit y accéder séparément.
- **Les photos envoyées par l'app ne vont pas dans les albums iPhone**, et
  celles rangées par le raccourci ne remontent pas dans la bibliothèque.
  Les deux systèmes sont indépendants — c'est voulu, mais il faut le savoir.

---

## Repères dans le code

| Fichier | Rôle |
|---|---|
| `pages/photos.js` | l'interface |
| `pages/api/photos/index.js` | liste et envoi |
| `pages/api/photos/[id].js` | correction d'album, suppression |
| `pages/api/photos/session.js` | connexion, déconnexion |
| `lib/classify.js` | le classement, partagé avec le raccourci |
| `lib/photos.js` | stockage et métadonnées |
| `lib/auth-photos.js` | le cookie signé |
| `lib/albums.js` | la liste des albums, dérivée du catalogue |
