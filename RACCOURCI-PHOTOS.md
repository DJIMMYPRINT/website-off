# Tri automatique des photos produit sur iPhone

Ranger chaque photo dans le bon album de l'app Photos, toute seule, au lieu de
scroller la galerie entière pour retrouver un gilet à envoyer à un client.

Deux morceaux :

1. **`/api/classify-photo`** sur le site — reçoit une photo, répond par le nom
   d'un album. Déjà codé, il n'y a qu'à brancher deux variables.
2. **Un raccourci iOS** — à monter une fois sur le téléphone, à la main.

---

## Étape 1 — Brancher l'API (5 min, sur ordinateur)

Sur Vercel → le projet → *Settings* → *Environment Variables*, ajouter :

| Nom | Valeur |
|---|---|
| `ANTHROPIC_API_KEY` | la clé du compte Anthropic (console.anthropic.com) |
| `CLASSIFY_SECRET` | un mot de passe inventé, long, ex. `tri-photos-7Kq2mZ` |

`CLASSIFY_SECRET` protège l'endpoint. Le site est public : sans cette clé,
n'importe qui pourrait faire tourner l'API sur notre compte Anthropic.

Puis **redéployer** (Vercel ne relit pas les variables sans nouveau déploiement).

Vérifier depuis un ordinateur :

```bash
curl -X POST https://djimmyprints.xyz/api/classify-photo \
  -H "x-cle-tri: LE_SECRET" --data-binary @une-photo.jpg
```

Ça doit répondre un nom d'album en clair, par exemple `Gilet avec col`.

---

## Étape 2 — Créer les albums (2 min, sur l'iPhone)

Photos → *Albums* → **+** → *Nouvel album*. Créer ceux-ci :

`Polo` · `T-shirt` · `Gilet avec col` · `Gilet sans col` · `Casquette` ·
`Catalogues` · `Tarifs` · `Logos clients` · `Réalisations` · `Autres`

> Les noms doivent être **exactement** ceux-là, accents compris.

Le site connaît 17 albums en tout (les 12 produits du catalogue + 5 fourre-tout).
Commencer par ces 10 : ce sont ceux qui servent tous les jours, et chaque album
en plus, c'est un bloc de plus à monter à l'étape 3. Les autres s'ajoutent plus
tard, sans rien changer au code. Tout ce qui n'est pas reconnu tombe dans
`Autres`.

---

## Étape 3 — Monter le raccourci (15 min, sur l'iPhone)

App *Raccourcis* → **+** → renommer en **Ranger la photo**.

### 3a. L'entrée

Icône *(i)* en bas → activer **Afficher dans la feuille de partage**.
Juste en dessous, régler *Types d'entrée* sur **Images** uniquement.

### 3b. Les actions, dans l'ordre

1. **Répéter pour chaque élément** — glisser `Entrée du raccourci` dedans.

   Tout ce qui suit va **à l'intérieur** de la boucle.

2. **Redimensionner l'image** → image : `Élément de répétition`, largeur **1024**,
   hauteur : *Automatique*.

   Pas décoratif : ça divise le coût par photo et évite le refus « trop lourde ».

3. **Convertir l'image** → format **JPEG**.

   Indispensable. L'iPhone photographie en HEIC, que l'API ne sait pas lire.

4. **Obtenir le contenu de l'URL** → `https://djimmyprints.xyz/api/classify-photo`

   Déplier *Afficher plus* :
   - **Méthode** : `POST`
   - **En-têtes** : clé `x-cle-tri`, valeur = le `CLASSIFY_SECRET` de l'étape 1
   - **Corps de la requête** : `Fichier`, puis choisir la variable `Image convertie`

5. **Si** → `Contenu de l'URL` · *est* · `Gilet avec col`
   - **Ajouter à l'album** → ajouter `Élément de répétition` à l'album
     `Gilet avec col`

   ⚠️ Bien mettre `Élément de répétition` (la photo d'origine), **pas** l'image
   convertie — sinon l'album se remplit de copies en 1024 px au lieu des vraies
   photos.

6. Répéter le bloc `Si` pour chaque album.

   Appui long sur le bloc `Si` entier → **Dupliquer**, puis ne changer que les
   deux noms d'album. Neuf duplications, c'est mécanique.

   Dernier bloc : `Autres`.

### Un raccourci si l'album accepte une variable

En touchant le champ *Album* de l'action **Ajouter à l'album**, si la barre
au-dessus du clavier propose d'insérer une variable : y mettre `Contenu de l'URL`
et **supprimer tous les blocs `Si`**. Le raccourci tombe à 5 actions.

Apple ne documente pas clairement si ce champ accepte une variable, et ça dépend
peut-être de la version d'iOS — d'où les blocs `Si` en méthode principale, qui
marchent partout. Ça vaut le coup de vérifier avant de dupliquer neuf fois.

---

## Étape 4 — S'en servir

Photos → *Sélectionner* → cocher les photos → bouton **Partager** →
**Ranger la photo**.

Ça marche sur une photo comme sur trente d'un coup. Chaque photo part au
classement puis atterrit dans son album ; elle reste aussi dans *Récents*,
rien n'est déplacé ni supprimé.

---

## Ce que ça coûte

Environ **1 centime de dollar par photo** avec le modèle par défaut
(Claude Opus 5) — soit à peu près 1 $ pour 100 photos.

Pour diviser ça par cinq : ajouter la variable Vercel `CLASSIFY_MODEL` =
`claude-haiku-4-5`. Sur du « c'est un gilet ou un t-shirt ? », un modèle plus
petit suffit largement. À essayer sur une vingtaine de photos avant de basculer
pour de bon.

---

## Limites connues

- **Vidéos : pas encore.** Raccourcis n'extrait pas simplement une image d'une
  vidéo, et l'API classe des images. Solution v2, à part.
- **Gilet avec/sans col** est la distinction la plus fine du lot. Si le col
  n'est pas visible sur la photo, ça peut se tromper — l'album `Autres` sert de
  filet.
- **Rien n'est renvoyé au site.** Le tri ne met pas à jour le catalogue de
  djimmyprints.xyz ; il ne fait que ranger la galerie du téléphone.

---

## Modifier la liste des albums

Tout est dans `lib/albums.js`. Les albums produits viennent directement de
`lib/products.js` : un produit ajouté au catalogue crée son album sans toucher à
rien. Les fourre-tout (`Catalogues`, `Tarifs`, …) se modifient dans
`EXTRA_ALBUMS`. Après changement, créer l'album correspondant sur l'iPhone et
lui ajouter son bloc `Si`.
