# Paysage naturel — état de la branche `paysage`

La branche ajoute un relief déterministe, un réseau de routes sinueuses et une végétation répartie autour des zones d'exposition. Les lots restent à leurs coordonnées et les réservations sont aplaties par le relief.

## Fonctionnalités présentes

- `assets/terrain/relief.js` : bruit multi-octaves, déformation du domaine, réservations planes et bornes d'altitude.
- `assets/roads/network.js` : boucle principale et liaisons secondaires déterministes.
- `assets/roads/roads.js` : rubans de chaussée, bas-côtés, lampadaires instanciés et franchissement léger.
- `assets/nature/scatter.js` et `nature.js` : répartition déterministe de trois modèles existants, avec des tailles et orientations variables.
- Le GPS voiture favorise les segments routiers ; les piétons gardent le calcul de trajet existant.
- Les troncs sont recherchés dans une grille spatiale de 10 m ; les buissons restent traversables.

## Validation

`node --test tests/*.test.mjs` passe avec 33 tests. Les tests couvrent la déterminisme du relief et de la végétation, les réservations des lots, les routes et les comportements existants.

Les captures et mesures sur un Mac réel restent à produire. Les mesures précédentes de foule et de rendu logiciel ne peuvent pas servir de mesure de performance du paysage sur le matériel de Simon.

## Limites connues

La végétation réutilise trois modèles locaux : elle ne constitue pas encore une bibliothèque de dix espèces différentes. Le maillage des routes n'est pas encore ajouté comme réservation aux futurs placements. Le relief et les routes sont générés au démarrage, sans streaming par tuile complet. Ces points doivent être traités avant de considérer la feuille de route terminée.
