# Jardins et pavillons du Parvis Méridien

Cette étape utilise exclusivement les cinq GLB déjà vérifiés du catalogue : pin, arbre feuillu, buisson, pavillon modulaire Astra et pavillon spatial vitré (`hangar-vitre`). Aucun nouvel asset externe, téléchargement, outil d’édition ou mode construction.

## Composition et emprises

Le plan déterministe compte 831 placements : 12 pins, 16 arbres feuillus, 800 buissons et trois pavillons. Huit pins accompagnent les deux côtés de l’avenue centrale ; les autres structurent quatre bosquets. Quatre jardins reçoivent chacun trois feuillus et une lisière de buissons. Deux pavillons Astra et un pavillon spatial vitré occupent les poches libres de la place, sans déplacer les édifices, la sculpture ou les repères d’échelle. Les deux bacs sud ont été resserrés et décalés pour dégager les bâtiments existants.

Les orientations et tailles des végétaux varient de façon reproductible, à l’intérieur des emprises vérifiées (houppiers et rotations compris). Les pavillons et les troncs rejoignent les collisions existantes. Les volumes des pavillons sont des obstacles pleins : cette étape ne crée pas d’intérieurs visitables.

L’extension concerne les bordures de 23 quartiers voisins. Attention à une contrainte du moteur : la chaussée occupe les premiers 4 m et la réservation PLV commence à 4,6 m, même si le quartier paraît vide. Cette bande de seulement 0,6 m accueille des buissons compacts (environ 30 cm de haut). Des pins adultes y empiéteraient sur les futures PLV ; ils restent donc dans le pilote. Ni la surface d’exposition, ni l’ordre d’attribution, ni le plan des lots ne sont modifiés. La cellule du test 50 000 est totalement exclue.

Les arbres rudimentaires du pilote sont masqués seulement après chargement réussi de tous les modèles. Les anciens arbres des chunks voisins (centres dans ±280 m) sont alors retirés ; les chunks plus éloignés sont conservés. Si un GLB échoue, le décor précédent reste disponible.

## Affichage et ressources

- Gestionnaire `AssetLibrary` existant, concurrence de chargement limitée à deux, cache et références.
- Dix ressources partagées (920 140 octets de GLB) : les cinq modèles, chacun en deux LOD existants ; aucun GLB ni texture dupliqué sur disque.
- Géométries préparées une seule fois : déquantification puis cuisson des transformations glTF. Matériaux/textures conservés, instances regroupées par modèle, LOD et secteur.
- LOD0 à moins de 55 m du centre de secteur en qualité moyenne (85 m haute). LOD1 au-delà ; qualité basse uniquement en LOD1. Coupure 240 m en moyenne, 140 m basse, 350 m haute. Sur la carte, seul le pilote reste visible en LOD1.
- Réévaluation de visibilité au plus cinq fois par seconde, sans construction de matrices ni de géométries dans la boucle. Le réglage existant « Densité : aucune » masque cet aménagement.
- Les dix ressources, de taille bornée, restent résidentes pendant la session pour éviter des téléchargements répétés sur les avenues. `dispose()` libère les instances, les géométries préparées et les références au gestionnaire. Il n’y a pas de cache IndexedDB supplémentaire.

## Préservation

Aucun changement du schéma ou du code de stockage, d’import/export, du catalogue des PLV, des sauvegardes, de la quantité QSJ ou des commandes. Interface et horizon des PR #2 et #3 conservés. Aucun asset confidentiel ni base64 ajouté.

Tests Node : emprises hors des routes et de toutes les réservations PLV (occupées ou non), cellule test exclue, volumes existants dégagés, séparation des pavillons et végétaux ; bibliothèque et licences inchangées.

Tests Chrome automatisés sur données publiques de démonstration : placement des lots et liste des quartiers disponibles identiques avant/après ; sauvegarde complète avec GLB, restauration/fusion sans doublon, quantité 100 persistante après rechargement et activation/retrait du test 50 000. Résultat dans `assets/validation/jardins/controles-donnees.json`.

## Captures et performances

Les captures avant/après utilisent le même inventaire de démonstration, les mêmes caméras au sol (hauteur 1,70 m) et en drone et les mêmes paramètres : 800 × 500, qualité moyenne, ratio 1, ombres et contact désactivés pour isoler le coût des modèles sur le GPU logiciel. Le démarrage du banc est effectué en qualité basse avant de rétablir ces paramètres identiques. Le rendu de l’environnement de test utilise SwiftShader logiciel ; il ne permet pas de certifier 50 FPS sur un Mac avec accélération matérielle. Le chargement, la visibilité et les LOD, les matrices finies, la libération idempotente et le repli après un GLB HTTP 404 ont aussi été testés dans Chrome (`controles-ressources.json`). Les mesures brutes et captures sont dans `assets/validation/jardins/`.

Licences : réutilisation CC0 des modèles Kenney et Quaternius ; voir [CREDITS.md](../CREDITS.md) et le manifeste existant. Aucun changement aux attributions des aéronefs CC BY 4.0 de l’horizon.

### Résultats mesurés

| Vue | FPS avant | FPS après | Appels avant / après | Triangles avant / après |
|---|---:|---:|---:|---:|
| Sol | 0,83 | 0,38 | 89 / 109 | 128 506 / 471 651 |
| Drone | 1,35 | 0,52 | 113 / 131 | 130 564 / 566 097 |

Ces valeurs sont celles du GPU logiciel SwiftShader, sans accélération matérielle. Le budget d’appels est respecté dans les deux vues ; l’objectif de 50 FPS n’est pas atteint ici, avant comme après. La végétation détaillée augmente le coût du rendu : les performances sur un portable réel restent à vérifier.

Caméra sol : position `(50, 1.7, 92)`, cible `(19, 5, 64)` ; drone : `(125, 115, 150)`, cible `(48, 0, 48)`. Cinq images de stabilisation puis six échantillons, intervalle entre premier et dernier. Ciel local HDRI et horizon bibliothèque actifs, heure 16 h 30. L’inventaire de démonstration compte 40 QSJ ; cette quantité de test ne modifie pas les données des utilisateurs.

| Vue | Avant | Après |
|---|---|---|
| Sol | [Capture](../assets/validation/jardins/avant-sol.png) | [Capture](../assets/validation/jardins/apres-sol.png) |
| Drone | [Capture](../assets/validation/jardins/avant-drone.png) | [Capture](../assets/validation/jardins/apres-drone.png) |

Le parcours complet avec jardins et horizon chargés a aussi vérifié l’ouverture/fermeture de la carte et l’activation/retrait des 50 000 objets, sans erreur JavaScript. Les avertissements PMREM de filtrage du ciel sont préexistants et apparaissent dans les deux passages.
