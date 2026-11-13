# Passation — PLV WORLD et Configurateur PLV 3D (Claude → ChatGPT / Codex)

## Qui / quoi
- Utilisateur : Simon, chargé de fabrication PLV (Groupe Albin Michel : Albin Michel, PUF, Terre Neuve…). **Pas développeur.** Français, réponses courtes et structurées.
- Deux outils distincts :
  1. **PLV WORLD** (ce dépôt) : monde ouvert three.js pour voir à l'échelle réelle toutes les PLV produites dans l'année.
  2. **Configurateur PLV 3D** : outil séparé (hors de ce dépôt) pour concevoir une PLV, la coter, poser les créas, et l'exporter.

## PLV WORLD — état actuel
- En ligne : https://simondelourme92.github.io/plv-world/ (GitHub Pages, branche `main`, racine). Toute modif poussée sur `main` est en ligne 1–2 min après.
- Dépôt **public** (compte gratuit, nécessaire pour Pages) → **rien de confidentiel** (BAT, créas éditeurs non publiées, données de fabrication). Ces éléments s'importent via l'interface et restent dans le navigateur (IndexedDB).
- Base : « phase 6 » (finitions et partage) : marche / course / drone / voiture, personnage, carte, visite guidée, mode photo HD, journal des lots daté, corbeille, import de modèles GLB + .meta.json, créas collées par lot, sauvegarde / restauration JSON, test 50 000 objets, ciel HDRI Poly Haven (chargé par URL + cache IndexedDB), réglages qualité.
- three.js r183 en modules ES via CDN (importmap jsdelivr).
- Le GLB de la Boîte QSJ a été **sorti du HTML** (il était en base64, 497 Ko) : `assets/plv/PLV_Boite_QSJ_FINAL.glb`, chargé par `fetch` dans `qsjBlob()` (constante `QSJ_GLB_URL`). HTML : 710 Ko → 214 Ko.
- Dossier `assets/` :
  - `plv/` : Boîte QSJ (.glb + .meta.json) — lot de 40 ex. ajouté au premier lancement.
  - `ciel/` : 2 HDRI 1K (Poly Haven, CC0) — **pas encore branchés** (le code utilise encore l'URL Poly Haven de qwantani_afternoon).
  - `textures/` : allee_paves, dalle_beton, herbe, asphalte — couleur / normal / rugosité 1024 px (ambientCG, CC0) — **pas encore branchées**.
  - `decor/` : 15 modèles Kenney low-poly (.glb, texture intégrée ; bâtiments, arbres, fontaine, routes avec lampadaires) — **pas encore branchés**. Échelle : tuile ≈ 1 unité, à agrandir (× 3 à 4).
- Ses données réelles (lots, créas) sont dans le navigateur de Simon, pas dans le dépôt. Les anciennes versions HTML autonomes avaient leurs propres données : passage via Menu → Exporter / Importer JSON.

## Règles de travail (voir aussi LISEZMOI.md)
1. **Jamais de base64** dans le code : fichiers binaires dans `assets/`, chargés par chemin relatif.
2. **Une étape à la fois**, commit clair en français, puis attendre la validation de Simon. Il teste en rechargeant le lien.
3. **Ne rien casser** de l'existant ; compatibilité des données IndexedDB et des sauvegardes.
4. Perf : ≥ 50 i/s sur portable de bureau, < 250 draw calls, InstancedMesh pour décor et PLV, rien de créé dans la boucle d'animation.
5. Ne jamais demander à Simon d'installer Node, Git, Python ou un serveur : il ne travaille que dans Chrome (Mac professionnel).
6. Expliquer simplement, sans jargon.

## Feuille de route proposée (Simon trouve le monde « moche »)
1. Brancher `assets/ciel/` (HDRI local, repli procédural) et lumière douce de fin d'après-midi.
2. Sols : `assets/textures/` sur allées / quartiers / place, adoucis pour s'accorder au style low-poly Kenney.
3. Décor Kenney instancié : arbres, lampadaires le long des allées, bâtiments en ceinture (skyline), fontaine sur la place ; densité réglable, coupé > 150 m.
4. Formulaire d'ajout de lot simplifié : modèle, éditeur (autocomplétion), nom de l'OP, quantité ; date d'ajout automatique.
5. Sauvegardes en ZIP (vrais fichiers, sans base64), compatibles avec les anciens JSON.

## Format d'échange avec le Configurateur PLV 3D
- Pour chaque PLV : `NOM.glb` + `NOM.meta.json`.
- GLB : PLV seule, sans livres ni cotes, **en mètres**, origine au centre au sol, Y vertical, face client vers +Z, créas collées en textures sur les pièces.
- meta.json : `{format:"plv-meta", version:1, nom, typeModele, glb, unite:"m", origine, axeVertical:"Y", faceClient:"+Z", dims:{l,p,h}, poidsCharge_kg, capacite_livres, facings, matieres:{…}, crea:[{face,nom}], source, export}`.
- Le configurateur n'a **pas encore de bouton d'export GLB** : la Boîte QSJ a été exportée manuellement (GLTFExporter three.js sur la scène du configurateur, sans les groupes `isBooks` / `isDims`, mise à l'échelle × 0,01, recentrée au sol). Ajouter ce bouton serait une bonne évolution du configurateur.

## Configurateur PLV 3D (pour mémoire)
- Version en ligne : artefact Claude privé (Simon seul), non modifiable depuis ChatGPT.
- Version autonome : `Configurateur_PLV_3D.html` (≈ 9,7 Mo, textures embarquées, s'ouvre en double-clic). Pour le faire évoluer côté ChatGPT, il faudra repartir de ce fichier (idéalement le mettre dans un dépôt séparé, assets à part, comme PLV WORLD).
- Fonctions : bases génériques (comptoir bois, comptoir carton, tourniquet bois, tourniquet métal, tourniquet comptoir à paniers, tourniquet comptoir moulinet, stop-rayon) ; colonne « Mes simulations » (OP, éditeur, matériel, date auto) ; couvertures / logos / frontons rattachés à une simulation ; export / import JSON d'une simulation (`format:"plvconf-simulation"`), « Tout exporter » (`format:"plvconf-bundle"`), export / import des couvertures (`format:"plvconf-covers"`) ; planche pro cotée, images HD ; décor Librairie.
- Projet en cours : OP « Que sais-je ? » 2027 (PUF) — boîte comptoir bouleau (Miletis, 26,6 × 24,6 × 11 cm), tourniquet de sol Hannecke U (7 étages, 336 vol.), tourniquet de comptoir métal type moulinet (3 étages × 4 poches × 8 livres = 96 vol., fronton 21,5 × 7 cm noir, « Que sais-je ? » vert émeraude).
