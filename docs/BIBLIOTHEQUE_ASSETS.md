# Bibliothèque d’assets et horizon — première sélection

## Périmètre et dépendance

Cette PR est empilée sur la PR d’interface **n°2** (`correction/interface-commandes-horizon`, base `7a89ce266e7efe1646ab737e0bac310141833bb5`). Elle doit être intégrée après cette dernière. Elle ne fusionne ni ne publie automatiquement l’interface ou le jeu.

Le texte joint propose une modularisation progressive du projet. Cette livraison isole uniquement un gestionnaire de ressources et un adaptateur d’horizon ; elle ne découpe pas tout le moteur. Les modèles de PLV, l’inventaire, IndexedDB, les sauvegardes, les collisions, les modes de déplacement et le test de charge ne sont pas réécrits.

## Inventaire initial

L’audit retrouve **30 fichiers graphiques hérités**, soit **16 GLB, 2 HDRI et 12 JPG**, pour 6 222 518 octets, hors code et captures de validation. Ils sont tous conservés octet pour octet. [Audit détaillé avec empreintes](assets-herites-audit.json).

La déclaration MIT de `assets/decor/LICENSE_Kenney.md` ne correspond pas au CC0 annoncé sur les pages officielles. Les membres et versions d’origine de ces quinze GLB ne sont pas documentés. Ils ne sont donc pas présentés comme une nouvelle sélection vérifiée et leur déclaration héritée reste inchangée. Les alias des anciens HDRI et textures ne donnent pas non plus leur identifiant de téléchargement précis. Ces limites sont inscrites à l’audit et à CREDITS.md.

Le QSJ est un modèle utilisateur ; il n’est pas inclus dans la bibliothèque libre et aucune licence de redistribution supplémentaire n’est supposée.

## Sélection vérifiée

**13 modèles**, **26 variantes GLB**, **23 SVG**. Modèles : **1,551,504 octets** (1.55 Mo). Huit modèles LOD 1 chargés par l’horizon : **152,448 octets**. Icônes : **16,460 octets**.

| Modèle | Catégorie | Dimensions de bibliothèque L × H × P (m) | LOD 0 / LOD 1 (Ko) | Triangles LOD 0 / 1 | Usage |
|---|---|---|---:|---:|---|
| Tour Méridien A | skyline | 73.19 × 155.00 × 73.19 | 18.8 / 13.9 | 1292 / 844 | Horizon |
| Tour Méridien C | skyline | 65.89 × 210.00 × 71.43 | 22.1 / 15.5 | 1704 / 978 | Horizon |
| Tour Méridien E | skyline | 77.77 × 245.00 × 74.57 | 16.7 / 12.6 | 1156 / 773 | Horizon |
| Relief Mountainside | relief | 252.37 × 259.98 × 129.81 | 223.2 / 24.4 | 8999 / 1099 | Horizon |
| Avion sans logo | aeronef | 35.48 × 11.32 × 37.68 | 75.2 / 28.5 | 5229 / 982 | Horizon |
| eVTOL sans logo | aeronef | 8.67 × 3.32 × 12.00 | 49.5 / 21.9 | 4084 / 1000 | Horizon |
| Drone sans logo | aeronef | 6.00 × 2.68 × 4.77 | 56.3 / 26.3 | 5170 / 1350 | Horizon |
| Navette cargo | aeronef | 15.67 × 7.84 × 24.00 | 5.8 / 5.8 | 264 / 260 | Horizon |
| Pavillon modulaire Astra | pavillon | 8.50 × 6.03 × 8.90 | 315.4 / 91.1 | 9104 / 2636 | Réserve |
| Pavillon spatial vitré | pavillon | 18.00 × 7.70 × 15.59 | 4.3 / 4.2 | 113 / 101 | Réserve |
| Arbre feuillu | vegetation | 4.06 × 9.43 × 4.24 | 129.7 / 90.4 | 3505 / 3338 | Réserve |
| Pin | vegetation | 5.73 × 7.38 × 5.22 | 100.5 / 72.7 | 3648 / 3168 | Réserve |
| Buisson | vegetation | 1.91 × 1.58 × 1.97 | 55.1 / 35.2 | 900 / 900 | Réserve |

Les dimensions des décors sont une **échelle de présentation**, avec un facteur explicite dans le manifeste. Elles ne modifient jamais les dimensions des PLV. Les arbres et pavillons sont en réserve : ils ne sont pas placés automatiquement autour de la place dans cette PR et n’occupent aucune nouvelle cellule d’inventaire.

Les composants de briques, les aliens, les accessoires cartoon, les gros packs complets, les logos commerciaux et les variantes Pro/Source payantes sont exclus. Les modèles retenus partagent une palette blanc/anthracite/verre bleuté/cyan ; la végétation conserve ses teintes naturelles.

## Sources et téléchargements

- Quaternius Modular Sci-Fi Standard FREE : panneaux, angles, colonnes, sol et encadrement du pavillon.
- Quaternius Downtown Standard FREE : panneaux vitrés et colonnes métalliques ; bâtiments de briques non retenus.
- Quaternius Stylized Nature Standard FREE : trois végétaux.
- Kenney City Kit Commercial 2.1 : trois gratte-ciel ; Space Kit 2.0 : navette et pavillon vitré ; Input Prompts 1.5A : vingt-trois icônes.
- Poly Haven : capture Mountainside 1K, adaptée en crête et teintée pour l’arrière-plan. Les fichiers d’origine sont vérifiés par leurs sommes de contrôle API.
- AMVLab : A320, eVTOL et drone **sans logos**, licence CC BY 4.0, empreintes Git des sources vérifiées.

**Aucun téléchargement sélectionné n’est resté bloqué. Aucune récupération manuelle n’est nécessaire pour cette sélection.** Les trois grandes archives Quaternius ne sont pas téléchargées intégralement : lecture des répertoires ZIP et extraction des composants et textures nécessaires par plages HTTP. Les petites archives Kenney restent uniquement dans l’espace temporaire ; aucun ZIP ni FBX/BLEND complet n’est ajouté au dépôt.

Liens officiels et notices individuelles : [CREDITS.md](../CREDITS.md), [manifest.json](../assets/library/manifest.json), `assets/library/licenses/`. Les liens publics des sources permettent aussi de récupérer manuellement les versions Standard gratuites si un fournisseur change son parcours de téléchargement à l’avenir.

## Optimisation et gestion des ressources

- GLB binaires autonomes, sans URI externe ni asset en base64.
- Textures WebP plafonnées à 512 px en LOD 0 et 256 px en LOD 1 ; UV et détails conservés, palette adaptée uniquement lorsque nécessaire. Les textures déjà petites ne sont pas agrandies. Pas d’ajout de transcodeur KTX2 pour ces petites textures.
- Déduplication, nettoyage, fusion par matériau lorsque possible, simplification à erreur limitée, quantification et Meshopt. Les feuillages conservent leur topologie lorsque la réduction dégraderait les cartes de feuilles ; les comptes réels sont indiqués au manifeste, sans promettre un taux uniforme.
- Cache indépendant de la base des PLV, deux chargements simultanés, décodeur Meshopt importé à la demande, comptage de références, délais d’éviction et annulation à la fermeture.
- Les huit GLB lointains sont instanciés ; aucun pavillon ou végétal proche n’est téléchargé par le jeu. Ils sont chargés dans le catalogue uniquement lorsqu’on les choisit.
- L’horizon conserve un profil atmosphérique de fond et remplace les tours et aéronefs en primitives par les GLB. Relief scanné adapté, bâtiments, avions/eVTOL/drone/navette sur trajectoires animées. A320 orienté selon son axe avant réel, distinct de celui des autres modèles.
- En Moyenne : 72 tours, 24 instances du relief et 6 appareils. En Basse : 36 tours, 12 reliefs et 2 appareils. Masquage en carte et ancien rendu ; interrupteur d’horizon conservé.
- Après désactivation prolongée : instances libérées après 15 s, puis ressources du cache après 15 s supplémentaires. Retour : rechargement. Si un fichier est absent, le fond procédural reste utilisable.
- Les matériaux de l’horizon sont volontairement simples et atmosphériques ; le catalogue montre les matériaux détaillés des versions proches. Pas de nouveaux post-traitements ou projecteurs.

Le relief est une adaptation artistique d’un fragment rocheux, **pas un terrain géographique complet ni une montagne topographique certifiée**. L’intégration des pavillons et végétaux au sol nécessitera une future validation de placement et de collisions, hors de cette PR.

## Catalogue et attribution

[Catalogue interactif](../assets/library/catalogue.html) : catégories, modèle proche/lointain, vue 3D orbitale, dimensions, poids, source, licence et fichier GLB. Il ne lit pas IndexedDB et ne touche pas aux lots.

Kenney Input Prompts est branché dans l’aide et la barre de raccourcis ; SVG distincts, texte accessible conservé. Les crédits AMVLab sont visibles dans le catalogue, dans les métadonnées GLB et dans le jeu via Réglages → Crédits des modèles 3D. L’auteur, CC BY 4.0 et les modifications sont explicitement indiqués.

## Vérifications

- `node --test tests/asset-library.test.mjs` : chemins uniques et contenus, licences et empreintes, en-têtes GLB et dépendances binaires, SVG passifs, dimensions et budgets.
- Validateur Khronos : **26 GLB, zéro erreur**. Dix avertissements de tangentes générées pour les versions proches à normales détaillées ; le validateur signale aussi informativement son support limité de la compression Meshopt. Le décodage réel est vérifié dans Chrome. [Rapport détaillé](validation-glb.json).
- Dans le catalogue : les 13 modèles et leurs deux LOD se chargent, avec sources, crédits et icônes. Le relief remanié est revérifié après adaptation.
- Cache : deux acquisitions partagent une même scène, les références sont comptées, la double libération est sans effet, l’éviction vide le cache ; fermeture pendant acquisition traitée.
- Fichier 404 simulé : construction de l’horizon refusée proprement et toutes les références des autres modèles relâchées.
- Monde : huit modèles prêts, neuf appels d’horizon, extinction prolongée → cache vide, retour → huit références réacquises ; carte et photo accessibles ; test de 50 000 objets activé puis retiré.
- Parcours de données vérifiés à graphisme réduit pour isoler la logique du GPU logiciel : sauvegarde complète avec GLB, restauration/fusion sans doublon, quantité conservée après rechargement, test de 50 000, emprises et cellules disponibles identiques avant/après.
- Les 30 assets hérités sont comparés octet pour octet au commit de base ; aucune modification, notamment du QSJ. Aucun inventaire privé utilisé.

L’automatisation du dépôt actuel a dépassé une première fois son délai de 30 s lors de l’injection du fichier de restauration en rendu logiciel chargé ; le parcours est ensuite entièrement vérifié avec l’horizon désactivé et un ratio réduit. Cela ne remplace pas un essai matériel de bout en bout sur le Mac cible.

## Captures

| Horizon (même caméra) | Avant | Après |
|---|---|---|
| Vue élevée | [Avant](../assets/validation/bibliotheque/avant-horizon.png) | [Après](../assets/validation/bibliotheque/apres-horizon.png) |

[Catalogue — pavillon](../assets/validation/bibliotheque/pavillon-astra.png) · [eVTOL](../assets/validation/bibliotheque/evtol.png) · [relief remanié](../assets/validation/bibliotheque/relief-montagne.png) · [prompts Kenney](../assets/validation/bibliotheque/commandes-kenney.png).

## Mesures réellement obtenues

Chromium sans écran, **SwiftShader logiciel**, qualité Moyenne, 800 × 500, ratio 1, distance d’affichage 350 m. Caméra `(50, 60, 94)` visant `(50, 115, -1800)`, trois images de chauffe puis six points (cinq intervalles). Même base d’inventaire et même position avant/après.

| Version | Images/s | Appels maximum | Triangles |
|---|---:|---:|---:|
| avant | 1.72 | 54 | 40,714 |
| apres | 1.52 | 55 | 128,520 |

Le budget de 250 appels est respecté dans cette vue. Le détail géométrique et le coût augmentent ; **les 50 images/s ne sont atteintes ni avant ni après dans cet environnement logiciel**. Aucun résultat extrapolé au GPU du Mac. [Mesures brutes](mesures-bibliotheque.json).

## Reproduction (mainteneurs)

[Outils de préparation](../tools/asset-pipeline/README.md) : récupération des versions gratuites, préparation des textures, transformations, GLB/LOD et validation. Rien à installer pour utiliser le jeu ou le catalogue dans Chrome. Ne pas généraliser les décors réservés au reste de la ville sans nouvelle validation.
