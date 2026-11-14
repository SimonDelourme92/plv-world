# Préparation des assets (mainteneurs)

Le jeu et le catalogue fonctionnent dans Chrome sans installation. Ces outils servent uniquement à reproduire la bibliothèque lors d'une nouvelle sélection.

Avec Node 22+ et Python 3 disponibles dans un environnement de développement :

```sh
cd tools/asset-pipeline
npm ci
python3 fetch-sources.py /tmp/plv-sources
node build.mjs /tmp/plv-sources
python3 finalize-manifest.py /tmp/plv-sources
npm run validate
cd ../..
node --test tests/asset-library.test.mjs
```

Les archives officielles Kenney restent dans le dossier temporaire ; les trois packs Quaternius Standard sont lus par plages HTTP et seuls les composants utiles sont extraits. Aucune version Pro/Source payante, aucun identifiant de compte, aucun modèle professionnel de PLV.

Les noms exacts des membres, empreintes des sources, licences et modifications sont inscrits au manifeste. Les GLB sont autonomes, recentrés, à échelle de présentation en mètres, avec textures WebP plafonnées et compression Meshopt. Les appareils restent des variantes sans logo. Le relief est une adaptation en crête du fragment Poly Haven Mountainside, pas une reconstitution topographique.

Si un fournisseur change son site ou sa version gratuite, arrêter et vérifier la licence et les fichiers avant de mettre à jour la sélection. Le script refuse les archives complètes dépassant 45 Mio et les extractions ZIP par plage au-delà de 16 Mio. Il n'est pas exécuté par le navigateur.
