# Berline, conduite et audio

Étape limitée au véhicule au sol. Aucun mode volant, construction, éditeur, modification des PLV, des réservations d’exposition ou du stockage IndexedDB. La ville, la végétation, l’interface et l’horizon des PR précédentes restent présents.

## Modèle et licence

Berline du **Generic passenger car pack**, par **Comrade1280**, sous **CC BY 4.0**. L’API Sketchfab indique le modèle téléchargeable et confirme cette licence ; son téléchargement direct renvoie HTTP 401 sans authentification. Le même FBX est distribué par le miroir documenté TUM-VT, avec README et attribution, commit épinglé `92be5975162ff9348c96d76dd6077321dce013dc`. L’empreinte du FBX correspond au pointeur Git LFS du dépôt source. Seuls la berline et ses textures utiles ont été récupérés.

Extraction, longueur 4,70 m, teinte anthracite, métal/vernis, vitres bleutées sombres, optiques avant/arrière distinctes, quatre roues et pivots avant, LOD et compression. Le modèle reste une berline générique sans marque ; ce n’est pas un modèle officiel BMW ou Audi, ni un modèle avec habitacle détaillé. Dimensions mesurées dans Chrome : **2,093 × 1,447 × 4,700 m** (largeur avec rétroviseurs).

| Fichier                                |                  Poids | Triangles | Licence   |
| -------------------------------------- | ---------------------: | --------: | --------- |
| `assets/vehicles/sedan/sedan.lod0.glb` |         376 196 octets |     7 122 | CC BY 4.0 |
| `assets/vehicles/sedan/sedan.lod1.glb` |         199 792 octets |     6 159 | CC BY 4.0 |
| Cinq OGG dans `assets/audio/vehicle/`  | 90 151 octets au total |         — | CC0 1.0   |

Tous les assets de production ajoutés représentent **666 139 octets**, hors code, licences et captures. Aucune archive, source FBX ou image inutilisée ajoutée au dépôt. Textures intégrées aux GLB binaires, aucun base64 dans le code. Manifestes et preuves de provenance accompagnent modèles et sons. Attribution visible dans Réglages → Audio du véhicule et `assets/vehicles/credits.html`, ainsi que dans CREDITS.md et les métadonnées GLB.

## Conduite et commandes

- Z/W : accélérer ; S : freiner puis reculer ; Q/A et D : direction ; touches fléchées conservées.
- Maj : vitesse maximale augmentée ; Espace : frein à main ; Espace + Z/W à faible vitesse : patinage léger.
- C : entrée/sortie, avec retour au mode de déplacement précédent ; molette : distance de poursuite, conservée.
- B : maintenir pour le klaxon ; L : phares ; N : couper/réactiver les sons du véhicule.
- La caméra reste derrière et au-dessus de la berline, avec lissage et recul supplémentaire jusqu’à 3,2 m selon la vitesse. Les contrôles de raccourcissement devant les obstacles sont conservés.
- Compteur discret : km/h, rapport simulé, régime. La voiture reste visible dans le mode photo lorsqu’on l’ouvre depuis la conduite.

La dynamique arcade isole accélérateur filtré, freinage, marche arrière, braquage réduit à haute vitesse et glissement latéral borné. Les rapports simulés provoquent une courte baisse de régime. La trajectoire réutilise la fonction SAT du moteur : rectangle orienté, obstacles et lots existants, sous-pas d’au plus 22 cm. Gabarit de collision ajusté au modèle réel, sans changement du plan des PLV. Les roues roulent selon la distance parcourue et les roues avant braquent autour de leurs pivots ; le patinage peut continuer à l’arrêt. L’ancien modèle et la conduite précédente sont conservés comme replis de chargement.

## Audio

Les cinq enregistrements viennent de **Car Sound Effects Pack (Low Quality)**, par **GGBotNet**, sous **CC0** : deux moteurs, démarrage, arrêt et klaxon. Ce sont des prises au téléphone, pas un enregistrement automobile de studio. Préparation mono 24 kHz, raccords cosinus sur les boucles et fondus sur les transitoires, Vorbis.

Deux boucles moteur se croisent progressivement selon le régime. Leur vitesse de lecture, leurs gains et leurs filtres utilisent des cibles lissées Web Audio. Une combustion harmonique de quatre cylindres ajoute le grave ; du bruit filtré complète roulement, vent et pneus selon vitesse/glissement. Limiteur en sortie. Les sources continues ne sont pas recréées à chaque changement de vitesse. Les cibles identiques ne sont pas reprogrammées inutilement et les indicateurs sont rafraîchis à 10 Hz.

Audio actif par défaut pour le véhicule, après un geste utilisateur exigé par Chrome. L’ambiance sonore historique garde son propre interrupteur. Le réglage de volume et la coupure du véhicule sont indépendants, stockés uniquement dans une **nouvelle clé localStorage** `plv-world-vehicle-audio-v1` ; aucun champ ajouté aux réglages IndexedDB ni aux sauvegardes. Pause, carte, photo et onglet masqué coupent les couches de conduite. Le démarrage et l’arrêt accompagnent l’entrée/sortie ; le klaxon cesse au relâchement de B ou en quittant la conduite.

[Écouter le rendu audio de validation de 10 s](../assets/validation/vehicule/moteur-test.ogg) : ralenti, montée en régime, rapports, pneus, klaxon et arrêt. Cet extrait est un rendu Web Audio déterministe de test, pas un enregistrement d’une session jouée.

## Vérifications

- Douze tests Node : bibliothèque et paysage existants, accélération/freinage/recul, braquage selon la vitesse, glissement borné, frein à main/patinage, collisions subdivisées, comportement à 30/60 Hz, roues séparées, matériaux, licences, intégrité et budgets.
- Deux GLB : validateur Khronos, **zéro erreur et zéro avertissement**. Le décodage Meshopt est aussi réellement testé dans Chrome.
- Vue isolée avec le HDRI local : quatre roues, dimensions ci-dessus, braquage avant −0,30 rad, arrière inchangé, rotation des roues 1,40 rad ; phares, feux stop et recul visibles. Ensemble avec sol : 11 appels, 7 148 triangles.
- Audio hors ligne : cinq fichiers décodés, RMS 0,0841, pic 0,6824 (pas d’écrêtage en sortie), coupure : silence exact. Aucun test ne peut certifier une absence perceptuelle de raccord sur tous les appareils.
- Chrome avec sa politique audio normale : clic réel sur le bouton voiture, contexte **running**, échantillons chargés et signal RMS non nul (0,0662 au ralenti). Conduite dans le monde : 55 km/h après quatre secondes simulées, passage en deuxième, braquage/glissement, frein à main, recul, arrêt avant un bâtiment à z = 48,8915, collision d’un lot et limites du monde vérifiés. B pressé/relâché, L et coupure N fonctionnels.
- Volume zéro, coupure, persistance dans la seule nouvelle clé localStorage et libellés accessibles : vérifiés dans Chrome.
- Parcours données sur inventaire de démonstration : mêmes lots, emprises et quartiers disponibles avant/après ; sauvegarde avec GLB, restauration/fusion sans doublon, quantité 100 persistante après rechargement, activation/retrait du test 50 000. Pas d’asset de PLV ni de donnée professionnelle ajouté ou modifié.

### Captures et limites de l’environnement

[Avant de la berline](../assets/validation/vehicule/berline-avant.png) · [Arrière, freinage et recul](../assets/validation/vehicule/berline-arriere.png)

Les captures isolées montrent le modèle réel sous le HDRI du projet. Le premier essai de capture de toute la ville en qualité moyenne a expiré après 300 s d’attente de disponibilité du décor dans SwiftShader logiciel. Les contrôles de conduite et d’audio exécutés avant cette attente avaient réussi. Cet environnement n’a pas de GPU matériel ; aucune promesse de 50 FPS sur un Mac ne peut être déduite de ces essais. Les rapports JSON restent dans `assets/validation/vehicule/`.


Le passage final en qualité moyenne a réussi en suspendant **seulement les appels GPU du banc pendant le chargement asynchrone**, puis en rétablissant le rendu normal avant quatre images de stabilisation et six échantillons. Le produit publié ne comporte pas cette adaptation de banc. Résultat à 800 × 500, ratio 1, ombres/contact coupés, HDRI et horizon actifs, végétation moyenne : **0,267 FPS, 135 appels de dessin, 451 071 triangles** sous SwiftShader. Budget d’appels respecté dans cette vue ; FPS matériels non certifiés et aucun comparatif avant/après à caméra identique réalisé pour cette étape.

[Capture de conduite dans la ville](../assets/validation/vehicule/conduite-ville.png). Le modèle et ses éclairages ont été rendus normalement, sans retirer de décor ; les dix ressources paysagères et les modèles d’horizon sont chargés. Le mode photo garde la voiture visible et C permet de retrouver le mode personnage précédent. Rapports : `conduite-fonctionnelle.json`, `controles-monde.json`, `mesures-monde.json`.
