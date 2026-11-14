# PLV WORLD

Monde ouvert three.js pour visualiser à l'échelle réelle les PLV produites dans l'année (1 unité = 1 m).

## Utilisation
Ouvrir le lien GitHub Pages du dépôt. Rien à installer, rien à télécharger.
Les lots, l'historique, les modèles importés et les créas sont stockés **dans le navigateur** (IndexedDB) et dans les sauvegardes faites depuis le menu. Ils ne sont jamais envoyés sur GitHub.

## Organisation
```
index.html            application (HTML + JS, three.js r183 via CDN)
assets/plv/           modèles de PLV (.glb + .meta.json) — Boîte QSJ (lot de démonstration), 2 colonnes et 8 stop-piles pliants, avec leurs quantités (tableau ALBIN MICHEL)
assets/terrain/       relief et textures du domaine pilote
assets/river/         lit de la rivière et du lac (riverbed.js) + eau (water.js)
assets/vehicles/      berline, dynamique de conduite   assets/audio/  sons du véhicule
assets/characters/    personnage et animations         assets/ciel/   ciels HDRI (CC0)
assets/library/       bibliothèque 3D et catalogue     assets/decor/  modèles Kenney (CC0)
assets/validation/    captures et mesures de validation
docs/                 audits et notes par étape        tests/         tests automatiques
tools/                pipelines de préparation des assets (usage assistant uniquement)
```

## Ajouter un modèle fourni
Déposer `NOM.glb` et `NOM.meta.json` dans `assets/plv/`, puis ajouter `["NOM",1]` à `EMBEDDED_MODELS` dans `index.html` (et, si on connaît la quantité, une ligne à `EMBEDDED_LOTS`). Au prochain chargement, le modèle (et son lot) apparaît dans le catalogue et dans le monde. Chaque modèle et chaque lot n'est proposé qu'une fois par navigateur : ce qui est supprimé ensuite ne revient pas. Pour remplacer le fichier GLB d'un modèle déjà fourni, remplacer le fichier et passer son numéro de version à 2 (3, …).

## Racks pour les petites PLV
Les PLV de moins de 60 cm (largeur et profondeur) et 50 cm de haut sont rangées sur des racks à lisses construits dans le code (`RACK` et `rackGrid` dans `index.html`) : montants bleus, lisses grises, tablettes bois, travées de 1,8 m, jusqu'à 2 m de haut, allées de 1,6 m entre les rangées. Les comptoirs, tourniquets et grandes PLV restent au sol. Aucun fichier 3D n'est téléchargé.

## Rivière, lac et eau
Une rivière avec un petit bras et une île, reliée à un lac, est creusée dans la zone x/z −500 à 0. L’eau (`assets/river/water.js`) est une surface unique au niveau −0,9 m : elle n’apparaît que là où le lit descend plus bas, avec berges peu profondes et claires, centre plus sombre, reflets du ciel et ondulations animées. Aucune texture. Elle suit le terrassement des lots. Marcher dans l’eau est possible (pas de nage ni de ralentissement pour l’instant). Si l’eau ne se charge pas, le lit sec reste affiché.

## Bibliothèque d’assets 3D

[Ouvrir le catalogue interactif](assets/library/catalogue.html) pour examiner les modèles, changer le niveau de détail, vérifier dimensions, poids, sources et licences. Il est aussi accessible depuis Réglages → Bibliothèque 3D. Aucun accès à l’inventaire local.

La sélection compte 13 modèles et 23 icônes professionnelles. Huit modèles allégés améliorent l’horizon ; les pavillons et végétaux aménagent désormais le Parvis Méridien et les bordures voisines. Les fichiers GLB, textures embarquées et SVG restent dans `assets/library/`, avec leur [manifeste](assets/library/manifest.json) et leurs licences. Le fond procédural reste disponible si un fichier ne peut pas être chargé.

Audit, provenance, optimisation, captures et validation : [docs/BIBLIOTHEQUE_ASSETS.md](docs/BIBLIOTHEQUE_ASSETS.md). Les étapes interface, bibliothèque et aménagement sont intégrées dans cet ordre.

## Berline et conduite

La voiture utilise la berline de Comrade1280 (CC BY 4.0), en anthracite et à l’échelle réelle. C pour entrer/sortir, ZQSD/WASD pour conduire, Espace pour le frein à main, B pour le klaxon, L pour les phares et N pour couper/réactiver le son du véhicule. Volume indépendant dans Réglages → Audio du véhicule ; le son nécessite un premier clic ou une touche dans Chrome. [Sources, captures et contrôles](docs/BERLINE_CONDUITE_AUDIO.md).

## Crash des PLV en voiture

En voiture, les PLV ne bloquent plus : chaque exemplaire touché (et les montants/tablettes des racks) devient un débris physique (`assets/crash/crash.js`). Au-delà de ~30 km/h et 3 exemplaires touchés, ralenti cinéma 2,8 s avec bandes noires et compteur. Tout revient en place après ~16 s (pas pendant que la voiture est à moins de 7 m). Rien n’est sauvegardé ; à pied, les collisions restent normales.

## Personnage humain et son d’exploration

La vue à la troisième personne utilise le modèle de Mike Alger (CC BY 4.0) et les clips marche, sprint et saut de la Universal Animation Library de Quaternius (CC0). Ils sont stockés séparément dans `assets/characters/`. L’animation est retargetée sur le squelette du modèle lors du chargement ; le modèle procédural existant reste un repli si les GLB ne se chargent pas. Les anciens réglages audio sont migrés vers une nouvelle commande générale avec le son activé par défaut ; un mute choisi dans la version actuelle est conservé. La barre **Son général** règle l’ambiance et la voiture, et 0 % coupe les deux. Chrome démarre la lecture après une première interaction.

Les modèles de jardins et de pavillons restent au catalogue mais ne sont plus placés : la pelouse est dégagée. [Détails](docs/AMENAGEMENT_JARDINS.md).

## Interface, commandes et horizon
Le menu distingue **Explorer**, **Inventaire**, **Réglages** et **Commandes**. Les mesures techniques sont masquées au départ et accessibles avec **F**. L’aide complète s’ouvre avec **H** ; les formulaires conservent la saisie normale.

ZQSD / WASD pour marcher ; pointeur visible et libre, déplacer la souris sur le monde pour orienter la caméra et cliquer directement sur l’interface. La barre **Son général** en exploration règle ensemble l’ambiance et la voiture. Maj pour courir, Espace pour sauter, **E** ou clic pour examiner une PLV. **C** prend / quitte le véhicule et restitue le point de vue précédent. **T** change de vue, **V** bascule en drone, **M** ouvre la carte, **O** le mode photo, **P** capture l’écran, Échap ouvre le menu. Sur la carte, la téléportation demande **Maj + clic** ; un clic sur un lot ouvre sa fiche.

La sensibilité souris et l’horizon sont réglables dans **Réglages**. Le ciel est dégagé, avec quelques navettes ; la skyline et les reliefs ont été masqués. Sources, vérifications et limites de performance : [docs/CORRECTION_INTERFACE_HORIZON.md](docs/CORRECTION_INTERFACE_HORIZON.md).

## Navigation GPS
Depuis la recherche, l’historique ou la fiche d’un lot, **GPS** définit un itinéraire sans déplacer le personnage ; **Téléporter** reste une action séparée. Un clic sur un lot de la carte ouvre aussi sa fiche, où l’itinéraire GPS est disponible. Le trajet est recalculé à pied ou en voiture lorsque le mode change ou que l’on s’écarte du parcours. La carte et la mini-carte affichent le chemin, et le panneau GPS indique la distance, l’estimation et la prochaine direction. Le guidage lumineux au sol peut être désactivé depuis ce panneau. Le parcours se termine automatiquement à l’arrivée. À pied comme en voiture, le GPS traverse maintenant les espaces ouverts en évitant les obstacles.

## Quartier pilote — Parvis Méridien
Dans le menu, **Découvrir le Parvis Méridien** ouvre une vue d’ensemble au sol. Les éléments architecturaux et paysagers de cette ancienne proposition sont retirés de la scène. Les PLV restent dans leurs quartiers d’exposition, à leurs dimensions réelles.

Analyse, périmètre et validation : [docs/QUARTIER_PILOTE.md](docs/QUARTIER_PILOTE.md). Sources et licences : [CREDITS.md](CREDITS.md).

## Ciel et éclairage
Le ciel visible est le HDRI **Ciel nuageux** (`assets/ciel/ciel_nuageux_1k.hdr`, Poly Haven, CC0) : ciel bleu et nuages, sans bâtiment. Il éclaire aussi la scène et se reflète dans la voiture et dans l’eau. Le HDRI « coucher de soleil » est gardé en secours pour l’éclairage seulement : son décor montre des bâtiments vénitiens et n’est jamais affiché en fond. Si aucun HDRI ne charge, le ciel procédural prend le relais ; la nuit, le ciel reste uni.

Les réglages HDRI, exposition, heure, ombres et ancien rendu restent disponibles. Three.js reste chargé depuis le CDN.

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

## Proposition Technoparc (branche de prévisualisation)
Le sol est plat et couvert de la texture Grass001. Le domaine accessible commence à 1 km de côté et s’étend automatiquement si des lots existants ou ajoutés nécessitent davantage de place ; les réservations et la capacité restent celles du monde initial. Les routes, leurs lampadaires et leurs panneaux ainsi que le relief du pilote ont été retirés de la scène. Les boutons **Zoom + / −** fonctionnent en exploration. Le fond sonore continu est remplacé par de rares brises et chants ; la sonorité moteur a été réaccordée. Voir [le périmètre et les contrôles](docs/TERRAIN_PILOTE.md).

## Lit de rivière
Un lit sec enherbé suit la partie ouest du domaine, avec une bifurcation, une île et un lac sec au sud-ouest. Il n'ajoute ni eau ni arbres. La rivière atteint environ 4 m de profondeur et le lac environ 7 m et les berges rejoignent progressivement le terrain plat. Les emprises des lots et des obstacles restent planes ; le lit s'adapte si l'inventaire change. Le module et la fonction d'altitude sont dans `assets/river/riverbed.js`.
