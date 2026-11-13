# Correction — interface, commandes et horizon

## Périmètre

Cette PR corrige uniquement la présentation, les contrôles et l’arrière-plan de PLV WORLD. Elle n’étend pas le quartier pilote et ne remodèle ni la voiture, ni le personnage, ni les PLV. La publication sur le site actuel attend la validation de Simon.

## Interface

- Menu réparti entre Explorer, Inventaire, Réglages et Commandes. Les visites et captures secondaires sont repliées ; les tests techniques restent accessibles dans Réglages → Tests et diagnostics.
- HUD limité par défaut au mode, au quartier et à l’inventaire. Vitesse en véhicule, altitude en drone ; coordonnées et mesures complètes sur F. L’état d’enregistrement reste visible dans Inventaire.
- Barre d’actions réduite, mini-carte plus compacte, fiche contextuelle raccourcie, aide temporaire au début de l’exploration.
- Navigation au clavier du menu, focus visible et mise en page étroite. Les éléments d’origine sont déplacés sans être recréés : identifiants et gestionnaires d’événements conservés.

## Commandes et caméra

| Action | Commande |
|---|---|
| Marcher / regarder | ZQSD ou WASD / souris |
| Courir / sauter | Maj / Espace |
| Examiner une production | E ou clic ; I conservé comme raccourci secondaire |
| Véhicule | C pour entrer/sortir ; retour au point de vue précédent |
| Vue personnage / drone | T / V |
| Carte | M ; clic sur un lot pour sa fiche ; **Maj + clic** pour se téléporter |
| Mode photo / capture | O / P |
| Aide / pause | H / Échap |
| Mesures techniques | F |

La souris est réglable ; la caméra externe amortit son déplacement puis recontrôle les collisions après le lissage. Les raccourcis ne détournent pas la saisie des formulaires. En drone, Ctrl permet toujours de descendre tout en avançant. Aucun déplacement automatique ni nouveau système physique.

## Horizon léger

Deux reliefs à 2 450 et 2 750 m, skyline répartie autour du monde à partir de 1 770 m, six navettes animées sans texture. Les façades, couronnements, vitrages, balises et navettes utilisent des géométries partagées et de l’instanciation. Aucune allocation de géométrie ou matrice par image ; un objet de transformation est réutilisé.

Le décor est rendu avant le monde, sans écrire dans la profondeur. La projection au fond conserve la distance d’affichage et le LOD existants des PLV. Il est masqué en carte et en ancien rendu. Les teintes suivent le jour et la nuit. En qualité Basse : 72 volumes de skyline et 2 navettes, contre 144 et 6 en Moyenne/Haute. Un interrupteur coupe l’ensemble dans Réglages.

**8 appels de dessin**, **6 680 triangles supplémentaires** dans la vue mesurée. Aucun projecteur, ombre, post-traitement ni fichier externe supplémentaire. Les bâtiments et reliefs sont hors des surfaces d’exposition ; le trafic est purement visuel en altitude.

## Données et fonctions conservées

Schéma IndexedDB v1, format de sauvegarde et identifiants inchangés. Deux préférences optionnelles sont ajoutées aux réglages : `mouseSensitivity` et `horizon`, avec des valeurs par défaut pour les anciennes sauvegardes. Aucun lot ni dimension de PLV modifié. Aucune donnée réelle du navigateur de l’utilisateur utilisée.

## Vérifications réalisées

- Analyse de syntaxe des trois modules JavaScript et contrôle du diff.
- Menu à 1 440 px et 390 px : tous les identifiants d’origine conservés, aucun doublon, accès aux quatre rubriques.
- Navigation, historique, catalogue, corbeille, formulaire d’ajout et mode photo accessibles.
- E ouvre la fiche du véritable GLB QSJ ; marche, course ×3, saut, déplacement vertical du drone et retour du véhicule au point de vue précédent vérifiés.
- Contrôle de collision du segment de caméra après lissage.
- Aucun raccourci photo déclenché en saisissant « photo » dans la recherche.
- Carte : masquage du fond ; clic dans le vide sans téléportation involontaire.
- Sauvegarde complète téléchargée avec modèle GLB, puis restauration/fusion de cette sauvegarde dans un navigateur de test, sans doublon de lot.
- Quantité et nouvelles préférences conservées après rechargement.
- Test de 50 000 instances activé et retiré, inventaire conservé.
- Avant/après : mêmes identifiants et quantités de lots, mêmes emprises et mêmes quartiers disponibles.
- Trafic réellement mobile, mode Basse réduit à deux navettes, horizon coupé en carte et réactivable.
- Aucune erreur JavaScript ou de compilation de shader dans les parcours ciblés finaux.

Ces tests utilisent des navigateurs isolés et les données de démonstration du dépôt. Le ressenti de souris et les performances matérielles sur le Mac de Simon restent à valider ; il ne s’agit pas d’une recette exhaustive de tous les anciens imports et créas.

## Captures réelles

Les comparatifs utilisent la même caméra et la même résolution.

| Vue | Avant | Après |
|---|---|---|
| Menu | [Avant](../assets/validation/correction/avant-menu.png) | [Après](../assets/validation/correction/apres-menu.png) |
| Exploration | [Avant](../assets/validation/correction/avant-exploration.png) | [Après](../assets/validation/correction/apres-exploration.png) |

[Vue supplémentaire de l’horizon depuis une caméra élevée](../assets/validation/correction/horizon.png).

## Mesures réellement obtenues

Chromium sans écran, SwiftShader, rendu **logiciel** ; qualité Moyenne, 960 × 600 pixels, ratio 1, distance 350 m, mêmes caméras. Trois images de chauffe, neuf points de mesure (huit intervalles). Les petites différences de cadence ne permettent pas de conclure à une amélioration de performance.

| Version | Images/s | Appels maximum | Triangles |
|---|---:|---:|---:|
| avant | 0.59 | 96 | 35,092 |
| apres | 0.63 | 104 | 41,772 |

Le budget de 250 appels est respecté dans cette vue. **Les 50 images/s ne sont atteintes ni avant ni après dans cet environnement logiciel.** Aucune extrapolation à Chrome sur Mac ou à un GPU matériel. [Mesures brutes](mesures-correction.json).

## Assets et licences

Aucun nouvel asset tiers. Interface, reliefs, skyline et navettes sont originaux ; pas de texture, police distante, modèle téléchargé ni base64 ajouté. Sources et licences : [CREDITS.md](../CREDITS.md). Les captures ne sont jamais chargées par l’application.
