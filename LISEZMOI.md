# PLV WORLD

Monde ouvert three.js pour visualiser à l'échelle réelle les PLV produites dans l'année (1 unité = 1 m).

## Utilisation
Ouvrir le lien GitHub Pages du dépôt. Rien à installer, rien à télécharger.
Les lots, l'historique, les modèles importés et les créas sont stockés **dans le navigateur** (IndexedDB) et dans les sauvegardes faites depuis le menu. Ils ne sont jamais envoyés sur GitHub.

## Organisation
```
index.html            application (HTML + JS, three.js r183 via CDN)
assets/plv/           modèles de PLV (.glb + .meta.json) — Boîte QSJ chargée au démarrage
assets/ciel/          ciels HDRI (Poly Haven, CC0)
assets/textures/      textures sol 1K couleur / normal / rugosité (ambientCG, CC0)
assets/decor/         modèles low-poly Kenney (.glb, texture intégrée) — voir LICENSE_Kenney.md
```

## Règles pour les assistants (ChatGPT, Claude…)
1. **Aucun asset en base64 dans le code.** Tout fichier binaire va dans `assets/` et se charge par chemin relatif (`fetch`, loaders three.js).
2. **Une étape à la fois.** Proposer, modifier, puis attendre la validation de Simon avant l'étape suivante. Chaque modification = un commit avec un message clair en français.
3. **Ne rien casser** : journal des lots, corbeille, IndexedDB, sauvegarde / restauration, import de modèles GLB, créas collées, carte, mode photo, test 50 000 objets. Les données déjà enregistrées doivent rester compatibles.
4. **Rien de confidentiel dans le dépôt** (il est publié sur un lien public) : pas de BAT, de créas éditeurs non publiées ni de données de fabrication. Ces fichiers s'importent depuis l'interface et restent dans le navigateur.
5. **Performances** : ≥ 50 images/s sur un portable de bureau, < 250 appels de dessin en vue normale ; décor et PLV en InstancedMesh ; aucune création d'objet dans la boucle d'animation.
6. Textes de l'interface en français.

## Feuille de route
1. Ciel et lumière avec les HDRI de `assets/ciel/`.
2. Sols : pavés, béton, herbe, asphalte (`assets/textures/`), adoucis pour s'accorder au style low-poly.
3. Décor Kenney instancié : arbres, lampadaires, bâtiments en périphérie.
4. Interface et carte harmonisées.
5. Sauvegardes en ZIP (vrais fichiers, sans base64).

## Crédits
Ciels : Poly Haven (CC0). Textures : ambientCG (CC0). Décor : Kenney (voir licence). Moteur : three.js (MIT).
