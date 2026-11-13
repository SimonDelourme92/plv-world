# Quartier pilote — Parvis Méridien

## Analyse préalable du moteur

- Monde de 2 000 × 2 000 m, cellules de 100 m. `CENTRAL=210` (X/Z : 0 à 100 m) et `TEST_CELL=190` sont déjà exclus de l'attribution des lots. Le pilote reste intégralement dans la cellule centrale. Aucun quartier supplémentaire réservé.
- Placement des PLV : intérieur de 90,8 m, marge de 4,6 m, intervalle de 5 cm, plusieurs cellules pour les grands lots. `available`, `buildPlan`, les dimensions métriques et les matrices des PLV restent inchangés.
- Exposition : les lots réels restent dans leurs cellules actuelles. La promenade ouest ouvre sur le quartier voisin ; aucun double des modèles ni exemplaire factice n'est ajouté.
- Collisions : AABB pour la marche, test de boîte orientée pour la voiture et protection de la caméra externe. Les nouveaux socles et bâtiments rejoignent ce même système ; leurs collisions ne dépendent pas du LOD visuel.
- LOD PLV existant : proche 45 m / intermédiaire 135 m / silhouette jusqu'à la distance choisie. Test de 50 000 objets indépendant, conservé.
- Ombres : carte locale 1 024 px en Moyenne, 2 048 en Haute, actualisée sur déplacement ou modification ; aucun projecteur ponctuel supplémentaire.
- Le moteur utilise une seule scène Three.js, sans compilation ni installation côté utilisateur. Le module du pilote est un fichier ES séparé, chargé par chemin relatif.
- IndexedDB v1, identifiants, catalogue, historique, corbeille, sauvegardes JSON et imports restent inchangés.

## Composition limitée au pilote

Architecture blanche et anthracite, verre bleuté réfléchissant, joints métalliques et cyan discret. Silhouettes à retraits, contreforts et casquettes ; les baies répétées et le mobilier sont instanciés. Une sculpture-portique ouvre une perspective nord/sud. Les jardins et bancs cadrent les accès. Les repères de taille (personne, palette, camion) sont conservés. Les anciens accessoires décoratifs qui traverseraient cette composition sont masqués dans son emprise, sans supprimer de lot. Le HDRI local fournit les reflets et la lumière indirecte ; un dégradé procédural léger évite un décor photographique incohérent autour des monuments. Sky sert seulement à précalculer les reflets de secours, sans diffusion atmosphérique coûteuse à chaque pixel.

Les ressources du pilote ont leur propre propriétaire : création à l'entrée, détails proches uniquement, maintien de la silhouette à moyenne distance, libération différée au-delà du rayon de résidence et recréation au retour. Aucune géométrie, matière ou matrice n'est créée à chaque image. Les transitions de ressources se font hors de la boucle de rendu.

## Périmètre

Cette PR prépare une direction artistique représentative. Aucun déploiement de ces bâtiments dans les autres cellules. Validation de Simon requise avant extension.

## Captures avant / après

Captures réelles du canvas, sans interface, même inventaire de démonstration, même caméra et mêmes réglages. La quantité du lot de démonstration est distincte de sa capacité en livres et des quantités enregistrées par chaque utilisateur dans son navigateur.

| Vue | Avant | Après |
|---|---|---|
| Au sol | [Capture avant](../assets/validation/pilote/avant-sol.png) | [Capture après](../assets/validation/pilote/apres-sol.png) |
| Drone | [Capture avant](../assets/validation/pilote/avant-drone.png) | [Capture après](../assets/validation/pilote/apres-drone.png) |

Caméra sol : position `(50, 1.7, 94)`, visée `(50, 13, 35)`. Caméra drone : position `(133, 94, 154)`, visée `(49, 14, 44)`. Perspective 68°, 960 × 600 pixels, ratio 1, distance 350 m, qualité Moyenne, ombres activées, heure 16 h 30, exposition 1.

## Mesures réellement obtenues

Chromium sans écran, rendu **logiciel SwiftShader**, dans l'environnement Cloud. Trois images de chauffe puis neuf points de mesure (huit intervalles `requestAnimationFrame`). Aucun résultat extrapolé à un portable ou à une carte graphique matérielle.

| Vue | Version | Images/s | Appels de dessin maximum |
|---|---|---:|---:|
| sol | avant | 2.33 | 95 |
| drone | avant | 1.87 | 105 |
| sol | apres | 0.69 | 96 |
| drone | apres | 1.03 | 106 |

Le budget de 250 appels est respecté dans ces deux vues. **L'objectif de 50 images/s n'est pas atteint dans cet environnement, ni avant ni après. Le pilote est plus lent ici.** Ces mesures courtes en rendu logiciel dépendent fortement de la charge CPU ; elles ne valident pas les performances sur le Chrome du portable cible. La PR doit rester une proposition à valider, sans extension à la ville. Mesures brutes : [mesures-pilote.json](mesures-pilote.json).

## Vérifications

- Syntaxe des deux modules et absence d'erreur JavaScript pendant les parcours testés.
- Avant / après : mêmes identifiants et quantités de lots, mêmes limites des blocs, même liste des cellules disponibles. Algorithme de placement et dimensions des PLV inchangés.
- HDRI principal, fichier principal absent, fichier principal invalide, deux HDRI absents : second HDRI puis environnement procédural de secours. Pas de requête Poly Haven à l'exécution.
- Cache HDRI puis rechargement, désactivation/réactivation HDRI, ambiance ancienne, carte et mode photo.
- Collision d'un bâtiment à pied et en voiture ; passage libre au milieu du portique.
- Éloignement au-delà de 600 m, libération après dix secondes, retour et recréation ; collisions toujours actives lorsque le décor est libéré. Détails masqués au-delà de 150 m (220 m en Haute), silhouette masquée à 430 m en exploration ; la carte conserve les volumes.
- Test de charge : **50 000 instances de test**, en plus de l'inventaire de démonstration ; activation puis retrait sans modifier les lots enregistrés.
- Modification synthétique d'une quantité et rechargement avec `?utm_source=chatgpt.com` : persistance IndexedDB vérifiée. Aucune synchronisation de lots vers GitHub.

Les sauvegardes, imports et créas n'ont pas été modifiés. Les données réelles de l'utilisateur n'ont pas été accessibles ni utilisées. Les vérifications ci-dessus ne constituent pas une recette exhaustive de toutes les fonctions historiques ni un test sur Mac.

## Nouveaux fichiers graphiques et licences

Aucun nouvel asset tiers. `assets/pilote/quartier.js` produit les géométries et la signalétique originales (CC0, voir [CREDITS.md](../CREDITS.md)). Les quatre PNG de validation sont des captures originales ; ils ne sont jamais chargés par l'application. Les deux HDRI 1K existaient déjà dans le dépôt et ne sont pas dupliqués.
