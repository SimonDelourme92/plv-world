# PLV WORLD — Feuille de route « un monde qui claque »

Objectif de Simon : un rendu de **jeu vidéo moderne** — une voiture qui claque, des décors qui claquent, un personnage qui ressemble à un vrai héros de jeu — tout en gardant la fonction : voir à l'échelle réelle les PLV de l'année.

Direction artistique retenue : **stylisé haut de gamme** (type Fortnite / Zelda BOTW / jeux mobiles AAA) plutôt que photoréaliste : plus beau, plus léger, plus cohérent avec des assets gratuits.

## Règles pour chaque étape
- Une étape = une pull request, testée sur le lien, validée par Simon avant la suivante.
- Assets uniquement sous licence libre (CC0 de préférence), rangés dans `assets/…`, crédités dans `CREDITS.md`. Jamais de base64.
- Budget : ≥ 50 i/s sur un portable de bureau en qualité « Moyenne » ; < 300 appels de dessin. Si un effet coûte trop → réglage on/off.
- Chaque étape livre : capture avant / après, i/s avant / après, liste des assets ajoutés (source, licence, poids).
- Assets lourds : glTF/GLB compressés (Draco ou meshopt) et textures KTX2 (Basis) dès l'étape 2 ; total `assets/` < 150 Mo.

## Sources d'assets conseillées
| Besoin | Source | Licence |
|---|---|---|
| Personnages animés (marche, course, saut, idle) | Quaternius — Ultimate Animated Character Pack, Universal Animation Library | CC0 |
| Personnage « héros » réaliste-stylisé | Mixamo (Adobe — Simon a une licence Creative Cloud) : personnage + animations exportées en FBX → GLB | usage autorisé dans un projet |
| Voitures stylisées | Quaternius — Cars Pack ; Kenney — Car Kit | CC0 |
| Ville, mobilier urbain, végétation | Kenney — City Kit (Commercial / Suburban / Roads), Nature Kit ; Quaternius — Ultimate Nature, City | CC0 |
| Ciels HDRI | Poly Haven | CC0 |
| Textures sol / murs | ambientCG, Poly Haven | CC0 |
| Recherche rapide de modèles low-poly | poly.pizza (filtrer CC0) | selon modèle |
| Sons (moteur, pas, ambiance) | Kenney Audio, freesound.org (CC0) | CC0 |

## Phase 1 — Rendu « wow » de base (lumière et caméra)
- Ciel HDRI local (`assets/ciel/`) + PMREM ; heure du jour réglable (matin / après-midi / coucher / nuit).
- Tone mapping AgX ou ACES, exposition auto douce.
- Post-traitement léger (EffectComposer) : **bloom** sur les lumières et néons, **SMAA**, **vignette**, légère **aberration** désactivable. SSAO en qualité Haute uniquement.
- Ombres douces du soleil qui suivent le joueur (cascade simple).
- Brouillard atmosphérique coloré par le ciel.
✅ Fini quand : la même vue de la place centrale paraît « photo de jeu » en capture.

## Phase 2 — Le personnage
- Remplacer le bonhomme en boîtes par un **personnage animé GLB** (Quaternius ou Mixamo) : idle, marche, course, saut, assis dans la voiture.
- `AnimationMixer` avec fondus entre animations ; vitesse d'animation calée sur la vitesse réelle (pas de glisse).
- Caméra **3e personne** façon jeu : suit en douceur, collision avec les murs, zoom molette ; 1re personne conservée (touche T).
- 3 ou 4 tenues au choix dans le menu.
✅ Fini quand : on a envie de se balader avec le perso.

## Phase 3 — La voiture
- Modèle de voiture stylisée GLB (Quaternius / Kenney), carrosserie en matériau brillant (clearcoat), phares et feux qui s'allument (bloom), roues qui tournent et braquent.
- Conduite arcade agréable : accélération progressive, dérapage léger, frein à main (Espace), boost (Maj) avec traînée lumineuse.
- Physique simple (Rapier en WASM via CDN, ou modèle arcade maison) : collisions avec bâtiments et lots de PLV.
- Caméra poursuite dynamique (recule avec la vitesse, légère secousse), son moteur qui suit le régime.
- Option bonus : **voiture volante** (touche V en conduite) pour survoler les quartiers.
✅ Fini quand : faire le tour du monde en voiture est fun.

## Phase 4 — Les décors
- Routes et trottoirs modulaires (Kenney City Kit) qui suivent la grille des quartiers ; marquages, passages piétons.
- Bâtiments en périphérie et en bordure de quartiers (skyline vivante, fenêtres éclairées la nuit).
- Végétation instanciée : arbres, haies, herbe avec léger mouvement au vent (shader).
- Mobilier : lampadaires (vraies lumières la nuit, limitées aux plus proches), bancs, poubelles, abribus, panneaux.
- Place centrale spectaculaire : fontaine animée, grand totem lumineux PLV WORLD, écrans géants affichant les créas de l'année.
- Eau : un canal ou un lac avec reflets (Water de three/addons) en qualité Haute.
✅ Fini quand : chaque quartier a une identité et rien ne paraît vide.

## Phase 5 — Vie et ambiance
- Piétons PNJ animés qui marchent sur les trottoirs (quelques dizaines, instanciés, LOD).
- Voitures PNJ simples sur les routes.
- Oiseaux, particules (feuilles, poussière dorée au coucher du soleil).
- Ambiance sonore spatialisée : ville, oiseaux, fontaine, moteur ; musique d'ambiance douce désactivable.
- Cycle jour / nuit optionnel en temps réel.

## Phase 6 — Mise en valeur des PLV (le cœur métier)
- Chaque lot exposé comme un **stand** : sol au couleurs de l'éditeur, totem lumineux (OP, quantité, date, vignette de la créa), projecteurs.
- Mode « inspection » : clic sur une PLV → caméra qui tourne autour, fiche détaillée, créa en grand.
- Visite guidée cinématique de l'année (caméra drone, musique, ordre chronologique), exportable en vidéo (MediaRecorder).
- Tableau de bord en jeu : nombre de PLV par éditeur / mois, en grand écran sur la place.

## Phase 7 — Interface de jeu
- HUD moderne (mini-carte ronde, boussole, vitesse en voiture), menus animés, écran titre avec la ville en fond.
- Carte plein écran stylisée, recherche d'une OP qui pose un repère et un itinéraire au sol.
- Écran de chargement avec progression réelle et astuces.

## Phase 8 — Performance et finition
- Streaming des assets par quartier (chargement / déchargement autour du joueur), cache IndexedDB.
- Réglages Qualité Basse / Moyenne / Haute / Ultra ; détection auto au premier lancement.
- Mode photo enrichi (filtres, profondeur de champ), captures 4K.
- Sauvegardes ZIP (vrais fichiers), compatibles avec les anciennes.

## Ordre conseillé
1 → 2 → 3 en priorité (lumière, perso, voiture : c'est ce qui « claque » le plus vite), puis 4, 6, 5, 7, 8.
