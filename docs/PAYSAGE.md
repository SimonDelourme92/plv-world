# Paysage — état au 14 novembre 2026 (branche `paysage`)

## Organisation du monde

| Zone | Emprise | Rôle |
|---|---|---|
| Cité | x −200 → 400, z −300 → 200 (6 × 5 quartiers) | Lots de PLV. Plate. Décor futuriste uniquement ici. |
| Allées | 9,2 m entre deux quartiers | Le boulevard y circule sans jamais toucher un quartier. |
| Campagne | Domaine jouable étendu à ±800 m (réseau routier + 35 m) ; arbres de décor jusqu’à ±1 000 m | Relief, rivière, lac, routes, forêts. |

Les lots existants ne bougent pas : le plan des lots est inchangé, seuls les quartiers **traversés par une route de campagne** sont retirés de la liste des quartiers disponibles. Aucun n’appartient à la cité ; le premier quartier exclu arrive au 23ᵉ rang d’attribution (test `roads-network.test.mjs`).

## Modules

- `assets/terrain/relief.js` — bruit multi-octaves déterministe. Nul dans la cité, il monte sur 15 → 230 m au-delà. Les lots et repères restent aplanis (réservations).
- `assets/roads/network.js` (sans Three.js, testé sous Node)
  - `createRoadNetwork()` : boulevard (7 m, angles de carrefour r = 6 m), boucle de campagne (6 m, ~4,7 km), liaisons nord, est, sud, ouest.
  - `blockedDistricts()` : quartiers exclus des futurs lots.
  - `profileNetwork()` : altitude de chaussée lissée (pentes < 20 %), pont automatique au-dessus de l’eau (tablier à ≥ 0,9 m, culées de 8 m).
  - `createRoadField()` : terrassement du sol le long des routes, altitude du tablier pour la marche et la voiture, distance aux routes (végétation, décor).
- `assets/roads/roads.js` — chaussées texturées (rives continues, axe discontinu), accotements gravillonnés, disques de carrefour, tablier, garde-corps, piles, 69 lampadaires (allumés la nuit), dessin 2D pour la mini-carte.
- `assets/nature/scatter.js` (sans Three.js, testé) — répartition déterministe : forêts de résineux, de feuillus ou mixtes, clairières, lisières (buissons, fougères), bosquets, arbres isolés, berges, rochers, alignement du boulevard. Exclusions : cité, routes, eau, repères.
- `assets/nature/nature.js` — chargement meshopt, modèles détaillés jusqu’à 60/80/110 m (Faible/Moyenne/Haute), petites plantes jusqu’à 40/55/70 m, silhouettes légères jusqu’à la distance d’affichage. Listes reconstruites tous les 12 m de déplacement. `refresh(lots)` efface la végétation sous les lots ; collisions à pied (`collides`) et en voiture (`collidesCar`).
- `tools/asset-pipeline/build-vegetation.mjs` — reconstruit les 10 nouvelles espèces depuis la version Standard gratuite du Stylized Nature MegaKit (CC0) et les ajoute au manifeste.

## Densités (Moyenne par défaut)

| Réglage | Végétaux | dont arbres |
|---|---|---|
| Faible | ~11 000 | ~7 000 |
| Moyenne | ~30 000 | ~21 000 |
| Haute | ~47 000 | ~33 000 |

## Intégration (`index.html`)

- Domaine jouable minimal porté de ±500 m à ±800 m pour que la boucle de campagne soit accessible (`assets/world/extent.js`, paramètre `minHalf`).

- Le tracé est calculé avant l’ordre des quartiers ; terrain = lit de rivière + relief, terrassé par les routes.
- `refreshLandscape()` est appelé après chaque placement de lots : végétation effacée sous les lots, terrain recalculé seulement autour des lots hors cité qui ont changé.
- Le lot test de 50 000 objets ne recalcule que son quartier (≈ 0,2 s).
- Voiture : troncs et rochers bloquent, tangage et roulis suivent la pente, caméra de poursuite au-dessus du sol. Les PLV restent destructibles en voiture.
- GPS voiture : masque routier précalculé (coût réduit sur chaussée).
- Diagnostics : `diagnostic().paysage` (routes, végétation, quartiers réservés).

## Vérifications faites (navigateur automatisé, rendu logiciel)

- `node --test tests/*.test.mjs` : 40 tests.
- Captures sol, drone, pont, forêt, carte : voir la PR.
- Pont : on roule à +0,94 m, le lit reste à −3,5 m dessous. Choc contre un tronc : arrêt. Lot posé en forêt : arbres effacés puis rétablis.
- Coût mesuré en rendu logiciel (indicatif) : ~95 appels de dessin et ~1,9 M triangles en forêt dense (206 arbres détaillés, 3 765 silhouettes).
- Captures : `docs/paysage/` (drone cité, drone campagne, pont, forêt, boulevard, carte).

## Limites connues / à faire

- **Performances à mesurer sur le Mac de Simon** (Moyenne et Haute). Si c’est lourd en forêt : baisser `NEAR` dans `nature.js` ou passer en densité Faible.
- Pas d’option séparée « Relief » ou « Routes » dans le menu (la densité du décor coupe la végétation).
- Garde-corps du pont sans collision : on peut tomber dans la rivière en voiture (sans danger).
- Les modèles détaillés n’ont pas de LOD intermédiaire efficace (feuillages en cartes) : les silhouettes lointaines sont générées à l’exécution.
