# Crédits — PLV WORLD

## Nouveaux éléments

Le quartier **Parvis Méridien** est une création procédurale originale pour PLV WORLD : bâtiments, portique, mobilier, jardins, calepinage et signalétique. Ces géométries et visuels générés sont mis à disposition sous [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). Le code est dans `assets/pilote/quartier.js` ; aucun modèle, texture photographique, police ou son tiers supplémentaire n'est téléchargé.

Les captures de validation sont produites à partir de cette scène et du contenu de démonstration déjà présent dans le dépôt. Aucun inventaire personnel ni fichier professionnel privé n'a été utilisé.

## Fichiers existants utilisés par cette PR

| Fichier | Source | Licence | Taille |
|---|---|---|---:|
| `assets/ciel/coucher_soleil_1k.hdr` | Poly Haven, fichier déjà fourni dans le dépôt | CC0 | 1 440 400 octets |
| `assets/ciel/ciel_nuageux_1k.hdr` | Poly Haven, fichier déjà fourni dans le dépôt | CC0 | 1 435 119 octets |

La provenance de ces fichiers renommés est donnée dans `PASSATION.md`. Poly Haven publie ses HDRI sous [CC0](https://polyhaven.com/license). Aucun nouveau HDRI ajouté ; chargement relatif, jamais depuis Poly Haven à l'exécution.

Three.js r183, ses contrôles, chargeurs, Sky et utilitaires de géométrie : [MIT](https://github.com/mrdoob/three.js/blob/r183/LICENSE). Le moteur reste chargé par l'importmap existante via jsDelivr.

Les textures ambientCG et modèles Kenney préexistants ne sont pas intégrés au pilote. Leur licence d'origine est inchangée ; voir `assets/decor/LICENSE_Kenney.md`. Le GLB QSJ fourni reste à son échelle réelle et n'est pas modifié.

## Poids des nouveaux fichiers

| Fichier | Taille |
|---|---:|
| `assets/pilote/quartier.js` | 11,771 octets |
| `assets/validation/pilote/apres-drone.png` | 327,277 octets |
| `assets/validation/pilote/apres-sol.png` | 283,011 octets |
| `assets/validation/pilote/avant-drone.png` | 363,063 octets |
| `assets/validation/pilote/avant-sol.png` | 252,788 octets |

## Correction de l’interface, des commandes et de l’horizon

- `assets/interface/interface.css` et `interface.js` : interface originale, polices système uniquement. Aucune bibliothèque d’icônes, police distante ou ressource graphique tierce.
- `assets/horizon/horizon.js` : reliefs, skyline et navettes procéduraux originaux, sans fichier 3D ni texture tiers. Les géométries et visuels générés sont mis à disposition sous CC0 1.0.
- `assets/validation/correction/` : captures de la scène et de l’interface réalisées avec les données de démonstration du dépôt. Aucun inventaire réel privé utilisé.

Aucun nouvel asset externe. Les licences des ressources existantes restent inchangées.

| Nouveau fichier de présentation | Taille |
|---|---:|
| `assets/interface/interface.css` | 14,405 octets |
| `assets/interface/interface.js` | 10,645 octets |
| `assets/horizon/horizon.js` | 6,864 octets |
