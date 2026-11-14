# Préparation du véhicule (maintenance uniquement)

Le site fonctionne directement dans Chrome ; aucune installation pour son utilisateur.

Sources épinglées et empreintes : `assets/vehicles/licenses/provenance.json`, miroir TUM-VT commit `92be5975162ff9348c96d76dd6077321dce013dc`. FBX et PNG suivis par Git LFS : utiliser `https://media.githubusercontent.com/media/TUM-VT/Sumonity-PassengerCars/COMMIT/models/import/sedan.fbx` et `/textures/NOM.png`. `lights.jpg` est un fichier Git classique, disponible sur `raw.githubusercontent.com`. Vérifier les SHA256 avant traitement. Les fichiers source restent hors du dépôt.

1. Mettre le FBX et les six textures nommées dans la preuve de provenance dans un dossier de travail.
2. `python tools/vehicle-pipeline/prepare-textures.py DOSSIER_SOURCE` (Pillow) : teinte anthracite conservant les détails et zones non peintes.
3. `blender -b --python tools/vehicle-pipeline/build.py -- DOSSIER_SOURCE SORTIE.glb` (Blender 4.3) : matériaux PBR, échelle, optiques, pivots. Aucun ajout d'habitacle ni logo.
4. Installer les dépendances du pipeline existant avec `npm --prefix tools/asset-pipeline ci` puis `node tools/asset-pipeline/build-vehicle.mjs SORTIE.glb assets/vehicles/sedan` : deux LOD, textures WebP 1024/512, Meshopt. Ne pas aplatir les nœuds des roues.
5. Télécharger et extraire dans un autre dossier l'archive CC0 GGBotNet référencée par `assets/audio/vehicle/licenses/provenance.json`, vérifier son SHA256. `python tools/vehicle-pipeline/prepare-audio.py DOSSIER_OGG assets/audio/vehicle` (FFmpeg) : ne retenir que cinq fichiers.
6. Actualiser les poids, SHA256 et triangles des manifestes, puis les captures et contrôles de validation. Les tests d'intégrité échouent si les manifestes ne correspondent plus aux binaires.

Les variantes proches conservent 7 122 triangles du modèle source ; les variantes lointaines en conservent 6 159 pour préserver roues et optiques. Le principal gain du LOD lointain porte sur les textures et la taille transférée. Ne pas présenter ce LOD comme une réduction géométrique de 50 %.
