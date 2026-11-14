# Technoparc : proposition pilote à valider

PR de prévisualisation, sans fusion automatique ni déploiement sur le site principal.

Le bouton « Domaine pilote » rejoint la zone au sol ; « Domaine · drone » montre la même zone d'en haut. Le pilote occupe x/z = 200–500 m, soit 9 hectares. Les routes restent à leur altitude actuelle, avec des raccords progressifs. Le relief est déterministe, généralement de 5 à 15 mètres hors raccords, avec un affleurement périphérique d'environ 45 mètres. Les emprises des lots et des objets fixes sont terrassées à zéro ; un changement d'inventaire reconstruit les altitudes sans modifier les données. La géométrie utilise 36 chunks avec trois résolutions (2, 5 et 10 m).

Les textures sélectionnées ont toutes été récupérées : aucune substitution. Le rendu mélange herbes, terre/sol forestier, roche selon la pente et gravier en bordure de chemins. Le bitume et les dalles sont disponibles dans la bibliothèque mais le réseau routier existant n'est pas rematérialisé dans cette proposition. Les cartes sont regroupées en trois atlas pour limiter les unités de texture ; le mélange de deux échelles et la modulation à grande échelle réduisent la répétition. Les herbes 3D ne sont visibles qu'à proximité du joueur. Les rochers et les herbes sont instanciés.

L'altitude est partagée par le terrain, la marche, la voiture, le suivi caméra et le guidage GPS. La voiture reste horizontale hors route : l'inclinaison du châssis sur pente n'est pas encore simulée. Le relief reste cantonné au pilote ; la ville et son horizon demeurent en place pendant cette validation.

Son : suppression du fond sourd continu, rares brises et chants synthétisés ; moteur réaccordé avec une combustion six cylindres, davantage d'harmoniques et moins de bruit de roulement. Le volume général continue de contrôler l'ensemble. Les boutons Zoom +/− règlent la distance des caméras personnage/voiture, ou le champ de vision à pied/drone.

Captures dans `assets/validation/terrain/` : avant/après avec mêmes positions, directions et dimensions d'image. Le paramètre de comparaison `?terrainBefore=1` désactive uniquement le pilote. Les captures du banc utilisent Chrome avec rendu logiciel ; elles ne constituent pas une mesure de fluidité sur le matériel de Simon.

Tests : `node --test tests/*.test.mjs` (17 tests). Les tests du terrain couvrent le déterminisme, la limite géographique, l'altitude maximale, les routes planes et le terrassement dynamique d'un nouveau lot. Les tests existants de navigation, végétation et conduite restent inclus.

Audio vérifié séparément dans Chrome via OfflineAudioContext : les échantillons chargent, le signal est présent, son pic reste inférieur à la saturation et la coupure produit un silence numérique. Un aperçu de dix secondes est fourni dans `assets/validation/terrain/moteur-apercu.wav` ; ce contrôle confirme le fonctionnement, l'appréciation du timbre reste à valider à l'écoute.

Limite des mesures : le test 50 000 objets n'a pas été relancé dans ce banc de capture. Les résultats ne permettent pas d'affirmer 50 images/s sur le matériel de l'utilisateur.
