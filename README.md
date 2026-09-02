# Djimmy Prints — site web

Site vitrine et prise de commande pour **Djimmy Prints**, imprimeur B2B
d'uniformes et de tenues de travail à Aïn Bénian, Alger.

Next.js 14 (Pages Router) + React 18. Pas de base de données, pas de backend :
les commandes et les devis partent en message WhatsApp pré-rempli, ce qui
correspond à la façon dont les affaires se traitent réellement ici.

---

## 1. Démarrer le projet

Prérequis : **Node.js 18.17+** (testé sur Node 22) et npm.

```bash
npm install          # installe les dépendances
npm run dev          # serveur de développement -> http://localhost:3000
```

Pour vérifier le rendu réel de production :

```bash
npm run build        # compile + vérifie les types et le lint
npm run start        # sert le build -> http://localhost:3000
```

> Lancez toujours `npm run build` après une modification et avant de déployer :
> le build attrape les erreurs (import cassé, prop mal orthographiée) que la
> simple lecture du diff ne montre pas. Ce code utilise beaucoup de
> `style={{...}}` en ligne, où une faute passe facilement inaperçue à l'œil.

---

## 2. Les pages

| Route | Rôle |
|---|---|
| `/` | Accueil : hero, techniques, chiffres clés, process en 3 étapes, témoignages |
| `/catalogue` | Catalogue complet + **configurateur de logo** (upload, glisser-déposer, redimensionnement, export PNG) |
| `/commande` | **Assistant de commande en 3 étapes** : produits & tailles → technique & logo → livraison & paiement |
| `/devis` | **Demande de devis gratuit** : produits, quantité, technique, délai + estimation de budget indicative |
| `/suivi` | **Suivi de commande** par référence `DP-XXXXXX`, avec la frise des 5 étapes |
| `/contact` | Coordonnées, horaires, FAQ |

---

## 2 bis. Thème & format

Le site est en **thème sombre « verre dépoli »** : fond quasi noir, cartes
translucides en relief, dégradés violet → indigo → cyan, coins très arrondis
et pastilles pleines.

Il est conçu **pour le smartphone** : tout tient dans une colonne unique
large comme un téléphone (`.app-shell`, max 520px, centrée). Sur un écran large,
le site s'affiche donc comme une application centrée sur fond sombre — c'est
voulu, pas un bug de mise en page.

La navigation se fait par la **barre d'onglets fixe en bas** (Accueil,
Catalogue, Commande, Suivi, Contact). « Devis » vit dans l'en-tête et porte
son propre état de page courante, puisqu'il n'a pas d'onglet.

Deux points à connaître avant de toucher aux couleurs :

- Les pages utilisent massivement des styles en ligne `style={{}}` qui
  référencent des `var(--token)`. Les anciens noms (`--cream`, `--white`,
  `--black`, `--green`…) sont conservés comme **alias** vers la palette
  sombre, en haut de `styles/globals.css` — changer un token là se répercute
  partout. `--white` est désormais la **surface des cartes**, pas une couleur
  de texte : sur un aplat accentué, écrivez `#fff` en dur.
- La police d'affichage est `Outfit`, via `var(--display)` qui embarque la
  pile de secours. N'écrivez jamais `fontFamily:'Outfit'` seul : si le
  webfont ne charge pas, le navigateur retombe sur son serif par défaut.

---

## 3. Où modifier quoi

Une information = un seul endroit. Ne recopiez pas ces valeurs dans une page.

| Vous voulez changer… | Fichier à modifier |
|---|---|
| Ajouter / retirer / re-tarifer un produit | `lib/products.js` — utilisé par `catalogue`, `commande` et `devis` |
| Numéro WhatsApp, téléphone, email, adresse, horaires | `lib/constants.js` |
| Wilayas, tailles, couleurs, techniques | `lib/constants.js` |
| Paliers de remise volume | `lib/constants.js` (`VOLUME_DISCOUNTS`) — la règle de calcul est dans `calcTotal()` de `pages/commande.js` |
| Étapes du suivi de commande | `lib/constants.js` (`ORDER_STAGES`) |
| Wilaya de départ des colis | `YALIDINE_FROM_WILAYA_ID` (voir §5 ter) — pas dans le code |
| Couleurs, polices, ombres, dégradés | variables CSS en haut de `styles/globals.css` (`--bg`, `--surface`, `--grad`, `--vio`, `--cya`…) |
| Grilles, barre d'onglets, shell | classes `.grid-2`, `.cards`, `.tabbar`, `.app-shell` dans `styles/globals.css` |
| Textes du hero, services, témoignages | `pages/index.js` |
| FAQ | `pages/contact.js` |
| Onglets du bas, en-tête, pied de page | `components/Layout.js` (tableaux `TABS` et `I` pour les icônes) |

**Attention aux remises volume :** `VOLUME_DISCOUNTS` sert à l'affichage, mais
les seuils réels (50 / 100 / 200 pièces) sont codés dans `calcTotal()`. Si vous
changez un palier, changez les deux.

---

## 4. Comment fonctionne une commande

1. Le visiteur remplit l'assistant sur `/commande`.
2. À la validation, le site génère une **référence** `DP-XXXXXX`.
3. Il ouvre WhatsApp avec un message pré-rempli : coordonnées, produits,
   tailles, technique, remises, total, et la référence.
4. Vous recevez le message et confirmez la commande à la main.

Il n'y a **volontairement** ni paiement en ligne ni backend. N'ajoutez pas de
passerelle de paiement sans le décider explicitement : ce serait un changement
de nature, pas une simple amélioration.

### Le suivi de commande (`/suivi`) — ce qu'il fait vraiment

Comme il n'y a pas de serveur, il n'existe pas de registre central à
interroger. Le site enregistre donc une copie de la commande **sur l'appareil
du client** (`localStorage`, voir `lib/orders.js`), ce qui lui permet de
retrouver sa référence, le détail de sa commande et l'étape en cours.

Conséquence à connaître : si le client commande depuis son téléphone puis
consulte `/suivi` depuis un ordinateur, la référence ne sera pas trouvée. La
page l'explique clairement et le renvoie vers WhatsApp, qui reste la source de
vérité. C'est une limite assumée du choix « sans backend », pas un bug.

Pour faire avancer une commande dans les étapes, il faudrait un backend
(Supabase, Google Sheets + API route, etc.) — c'est le prolongement naturel si
le besoin se confirme.

---

## 5. Déployer

Le plus simple est **Vercel** (l'éditeur de Next.js) :

1. Poussez le dépôt sur GitHub.
2. Sur [vercel.com](https://vercel.com), *Add New → Project*, importez le dépôt.
3. Vercel détecte Next.js seul : aucun réglage à changer, cliquez *Deploy*.
4. Dans *Settings → Domains*, ajoutez `djimmyprints.xyz` et suivez les
   instructions DNS chez votre registrar.

Chaque `git push` redéploie automatiquement.

Alternative auto-hébergée : `npm run build && npm run start` derrière un reverse
proxy (Nginx), avec un gestionnaire de process type `pm2`.

---

## 5 bis. Base de données (suivi de commande)

Le suivi de commande s'appuie sur le projet Supabase **`dp-erp`**
(`pmqdltywisvlmuuwcxpb`, région eu-west-3).

### Ce qui a été créé

- Un schéma **`site`** contenant la table `site.orders`.
  Il est délibérément **hors du schéma `public`** : ce dernier appartient à
  Prisma (voir `public._prisma_migrations`) côté ERP. Une table ajoutée là
  dériverait, voire serait supprimée, à la prochaine migration Prisma.
- Trois fonctions dans `public` (le seul schéma exposé par PostgREST) :
  `site_order_create`, `site_order_get`, `site_order_set_stage`.
  Elles sont `SECURITY DEFINER`, avec un `search_path` épinglé, et
  `EXECUTE` n'est accordé qu'à **`service_role`**.
- RLS activée sur `site.orders`, sans aucune politique : seul
  `service_role` peut lire ou écrire.

### Variables d'environnement (à définir dans Vercel)

| Variable | Valeur |
|---|---|
| `SUPABASE_URL` | `https://pmqdltywisvlmuuwcxpb.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | *Supabase → Settings → API → `service_role`* |

Sans ces deux variables, `/api/orders` répond `503 { configured: false }`
et les pages retombent sur la copie conservée sur l'appareil du client.
**Une clé absente dégrade le suivi, elle ne casse jamais le site.**

> ⚠️ La clé `service_role` ne doit **jamais** être préfixée
> `NEXT_PUBLIC_`, ni utilisée hors de `lib/db.js` / `pages/api/`. Elle
> contourne RLS et donne un accès total à la base.

### Faire avancer une commande

```sql
select public.site_order_set_stage('DP-XXXXXX', 'production');
-- étapes : recue | confirmee | production | expediee | livree
```

### ⚠️ Sécurité : RLS désactivée sur l'ERP

Les **17 tables du schéma `public`** (`Client`, `Devis`, `Commande`,
`Facture`, `Paiement`, `Produit`, `MouvementStock`…) ont
**Row Level Security désactivée**. Toute personne disposant de la clé
`anon` du projet — une clé conçue pour être publique — peut lire et
modifier chacune de ces lignes.

C'est un problème **antérieur à ce site** et sans rapport avec lui : le
site ne transmet aucune clé Supabase au navigateur, précisément pour
cette raison. Il reste à traiter côté ERP.

Ne lancez pas `ENABLE ROW LEVEL SECURITY` à l'aveugle : sans politiques,
cela coupera tous les accès de votre application ERP. Il faut activer RLS
**et** définir les politiques adaptées, table par table.

---

## 5 ter. Tarifs de livraison (Yalidine)

`/commande` affiche le tarif Yalidine réel vers la wilaya choisie par le
client, au lieu de le discuter après coup sur WhatsApp.

### Le chemin

`pages/commande.js` et `pages/devis.js` → `lib/useShipping.js` (le hook
partagé : requête, repli et formatage au même endroit, pour que les deux
pages ne divergent pas) → `GET /api/shipping?wilaya=16 Alger` →
`lib/yalidine.js` → `https://api.yalidine.app/v1/fees/`.

Comme pour Supabase, **les identifiants ne quittent jamais le serveur** : le
token Yalidine n'est pas en lecture seule, il permet de créer, modifier et
supprimer des colis sur le compte.

### Variables d'environnement (à définir dans Vercel)

| Variable | Valeur |
|---|---|
| `YALIDINE_API_ID` | *espace Yalidine → « Développement »* |
| `YALIDINE_API_TOKEN` | *idem* |
| `YALIDINE_FROM_WILAYA_ID` | `16` (Alger) — facultatif, 16 par défaut |

Sans ces variables, `/api/shipping` répond `503 { configured: false }` et le
récapitulatif masque simplement le bloc livraison. **Une clé absente retire
l'estimation, elle ne casse jamais la commande.**

### Pourquoi le tarif n'entre pas dans le TOTAL

Trois raisons, à garder en tête avant de « corriger » ce point :

1. **Yalidine tarife un colis, pas une commande.** 20 polos tiennent dans un
   colis, 300 non. Ajouter un tarif unique au total sous-estimerait le coût
   précisément sur les grosses commandes.
2. **Le tarif varie d'une commune à l'autre** dans une même wilaya.
3. `calcTotal()` alimente le message WhatsApp et le registre des commandes.
   Les remises volume y sont volontairement la seule chose qui bouge le
   total.

Le bloc est donc affiché **à côté** du total, avec la mention « par colis »,
et repris dans le message WhatsApp pour que l'atelier voie le même chiffre
que le client.

### Commune et mode de livraison

Le sélecteur de commune de `/commande` est **rempli par l'API**, pas par une
liste en dur : c'est la grille de livraison de Yalidine qui fait foi, et elle
change sans prévenir. Il n'apparaît donc qu'une fois la réponse reçue, et
reste facultatif.

- **Commune choisie** → tarif exact (`850 DA`).
- **Commune non choisie** → fourchette sur la wilaya (`700 – 850 DA`), avec
  la mention explicite qu'il s'agit d'une fourchette.

Le client choisit ensuite **à domicile** ou **au bureau (stop desk)** ; le
mode retenu et son tarif partent dans le message WhatsApp, avec la commune.

`/devis` affiche la fourchette au niveau de la wilaya seulement, sans
sélecteur de commune : un devis est volontairement grossier (voir le
commentaire sur `DELAIS`), demander la commune y serait de la fausse
précision.

### Le cache

Les tarifs sont mis en cache 12 h en mémoire (`lib/yalidine.js`) et 12 h au
niveau du CDN (`Cache-Control` sur la route). Yalidine impose un quota de
requêtes strict par compte : sans ce cache, une poignée de visiteurs
suffirait à l'épuiser et à bloquer les appels de création de colis.

### Si la réponse change de forme

La documentation Yalidine vit dans l'espace client et les noms de champs ont
déjà changé selon l'agent (`yalidine` / `goupex`). `normalise()` accepte donc
plusieurs orthographes (`express_home`, `home`, `livraison_domicile`…) et
**lève une erreur explicite** quand il ne reconnaît rien, plutôt que
d'afficher « 0 DA ». Un prix faux montré à un client est pire qu'un prix
absent. En cas de doute, `GET /api/shipping?wilaya=31` renvoie
`unrecognised: true` : comparez alors la réponse réelle de l'API aux clés
listées en haut de `lib/yalidine.js`.

---

## 6. Analytics

Google Analytics (`G-0HDWJXSBT1`) et Meta Pixel (`1011828568104757`) sont
câblés dans `pages/_document.js`. Événements envoyés :

- `Purchase` (valeur en DZD) à la validation d'une commande
- `Lead` à l'envoi d'une demande de devis

Ces identifiants suivent le site réel — ne les remplacez pas par des
placeholders.

---

## 7. Points à traiter plus tard

- **Photos produits.** Le catalogue utilise des emoji comme visuels
  (👕, 🧥, 🧢…). C'est un placeholder qui fonctionne, mais de vraies photos
  de vos réalisations auraient beaucoup plus d'impact commercial.
- **Version de Next.js.** Le projet est sur `next@14.2.3`, signalé par npm
  comme ayant une faille de sécurité. La mise à jour est souhaitable, mais à
  faire comme un changement à part entière, avec rebuild et re-test complets.
- **Favicon.** Généré à partir du logo (`public/favicon-32.png`,
  `apple-touch-icon.png`). Remplacez-les si vous avez une version dédiée.
- **Suivi de commande côté serveur**, si vous voulez pouvoir faire avancer les
  étapes vous-même (voir §4).

---

## 8. Structure

```
components/   Layout (nav, menu mobile, pied de page), Aurora (fond animé)
lib/          constants.js (faits métier) · products.js (catalogue) · orders.js (suivi local)
              db.js (Supabase, serveur) · yalidine.js (tarifs livraison, serveur)
              useShipping.js (hook livraison, partagé commande + devis)
pages/        index · catalogue · commande · devis · suivi · contact · _app · _document
public/       logo, favicons, robots.txt, sitemap.xml
styles/       globals.css (design tokens, typographie, boutons, grilles responsives)
```
