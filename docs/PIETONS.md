# Visiteurs piétons

Les visiteurs sont chargés en arrière-plan après le démarrage et réutilisent le personnage et les animations présents. Ils se regroupent autour des lots proches, s'en approchent, s'arrêtent et repartent ; ils restent au-dessus du niveau de l'eau. Le menu « Qualité et distance » permet de les désactiver ou d'en choisir le nombre. Les préréglages basse/moyenne/haute sélectionnent 10/24/36 visiteurs. Pendant les comparatifs, la carte et le test de 50 000 objets, ils sont masqués ; ils sont figés en pause et restent visibles en photo et en visite.

Pour tenir le plafond de 80 appels, jusqu'à cinq visiteurs proches sont détaillés lorsque les ombres sont activées, ou dix lorsque les ombres sont désactivées. Les autres visiteurs visibles partagent un seul objet instancié. Les itinéraires sont préparés hors de la boucle de rendu, au maximum un à la fois ; les animations et les palettes sont partagées.

## Vérifications

`node --test tests/*.test.mjs` : 27 tests réussis, dont cinq tests de logique des visiteurs. Sous la version Node disponible ici, la commande `node --test tests/` ne découvre pas le dossier ; le motif `tests/*.test.mjs` exécute les fichiers demandés.

Chrome automatisé a contrôlé le démarrage, les vues à pied, personnage, voiture et drone, la carte, la photo, la visite, un comparatif, les préréglages et le curseur. Le test de charge est passé de 4 204 à 54 204 objets puis revenu à 4 204 ; les visiteurs étaient masqués. Le contrôle ciblé en plaçant des visiteurs près de la caméra a mesuré 71 appels de dessin pour cinq personnages détaillés et douze silhouettes, ombres comprises ; le visiteur testé s'est déplacé de 0,44 m devant une voiture en approche. Aucune erreur JavaScript n'a été relevée dans ces contrôles.

## Mesures avant / après

Chrome sans fenêtre, rendu **logiciel SwiftShader**, fenêtre 1 000 × 650, 24 visiteurs actifs, échantillons d'environ quatre secondes. Les données ci-dessous sont les valeurs réellement renvoyées par le moteur ; elles ne représentent pas les performances sur le Mac de Simon.

| Vue | Visiteurs | FPS | Appels du monde | Triangles | Diagnostic visiteurs |
| --- | --- | ---: | ---: | ---: | --- |
| Départ | désactivés | 1,0 | 49 | 408 026 | 0 actif |
| Départ | activés | 0,9 | 50 | 409 130 | 24 actifs, 0 détaillé, 12 silhouettes, 1 appel, 19 trajets en attente, 0,1 ms |
| Place centrale | désactivés | 0,5 | 65 | 772 030 | 0 actif |
| Place centrale | activés | 0,4 | 66 | 772 858 | 24 actifs, 0 détaillé, 9 silhouettes, 1 appel, 14 trajets en attente, 0,1 ms |

Les FPS logiciels sont trop faibles et variables même sans visiteurs pour vérifier l'objectif de 50 FPS sur un Mac. La mesure `msParImage` concerne la mise à jour de la foule et ne comprend pas le calcul d'itinéraire différé sur le fil principal. Le budget de rendu avec des personnages détaillés a été vérifié séparément, au plus près de la caméra.

## Limites

L'évitement reste géométrique : dans un espace complètement bloqué, un visiteur peut attendre qu'un passage se libère. Un itinéraire dont les points traversent l'eau est refusé ; le routeur ne recherche pas encore un détour spécialement autour de l'eau, donc un visiteur peut attendre une autre destination. La synchronisation des pas et l'apparence des interactions demandent un contrôle visuel sur le matériel de Simon. La branche n'est pas fusionnée et aucun aperçu séparé utilisant ses données IndexedDB n'est configuré.
