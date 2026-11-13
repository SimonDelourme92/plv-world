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

## Interface, commandes et horizon
Le menu distingue **Explorer**, **Inventaire**, **Réglages** et **Commandes**. Les mesures techniques sont masquées au départ et accessibles avec **F**. L’aide complète s’ouvre avec **H** ; les formulaires conservent la saisie normale.

ZQSD / WASD et souris pour marcher ; Maj pour courir, Espace pour sauter, **E** ou clic pour examiner une PLV. **C** prend / quitte le véhicule et restitue le point de vue précédent. **T** change de vue, **V** bascule en drone, **M** ouvre la carte, **O** le mode photo, **P** capture l’écran, Échap ouvre le menu. Sur la carte, la téléportation demande **Maj + clic** ; un clic sur un lot ouvre sa fiche.

La sensibilité souris et l’horizon sont réglables dans **Réglages**. Le fond réunit une skyline, deux reliefs lointains et quelques navettes, sans occuper de surface d’exposition. Sources, vérifications et limites de performance : [docs/CORRECTION_INTERFACE_HORIZON.md](docs/CORRECTION_INTERFACE_HORIZON.md).

## Quartier pilote — Parvis Méridien
Dans le menu, **Découvrir le Parvis Méridien** ouvre une vue d’ensemble au sol. La place centrale accueille une proposition architecturale limitée : portique, six bâtiments, galeries, jardins et mobilier. Les PLV restent dans leurs quartiers d’exposition, à leurs dimensions réelles. Le reste du monde attend validation.

Analyse, périmètre et validation : [docs/QUARTIER_PILOTE.md](docs/QUARTIER_PILOTE.md). Sources et licences : [CREDITS.md](CREDITS.md).

## Ciel et éclairage
L’éclairage et les reflets de fin d’après-midi chargent `assets/ciel/coucher_soleil_1k.hdr`. Si ce fichier est indisponible ou invalide, le ciel nuageux local prend le relais, puis le ciel procédural. Le ciel visible reste procédural pour éviter les bâtiments photographiés du HDRI derrière la cité. Le soleil est adouci et la lumière ambiante du HDRI préfiltrée une seule fois au chargement. Aucun appel à Poly Haven n’est nécessaire.

Les réglages HDRI, exposition, heure, ombres et ancien rendu restent disponibles. Le cache local utilise des clés propres à ces fichiers, sans modifier les lots, les sauvegardes ni le schéma IndexedDB. Three.js reste chargé depuis le CDN.

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

## Feuille de route
Voir **FEUILLE_DE_ROUTE.md** (version détaillée « un monde qui claque »).
