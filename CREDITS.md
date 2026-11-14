# Crédits — PLV WORLD

## Bibliothèque 3D sélectionnée

Les modèles restent sous leurs **licences respectives**. Aucune licence globale CC0 n’est appliquée aux fichiers AMVLab ni aux modèles professionnels de PLV. Les sources, empreintes, dimensions, poids et variantes figurent dans [le manifeste](assets/library/manifest.json).

### Attribution AMVLab (CC BY 4.0)

Les variantes sans logos **A320_nologo**, **EVTOL_nologo** et **drone_nologo** sont créées par [amvlab](https://github.com/amvlab/aircraft-models) et utilisées sous [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/). Adaptations pour PLV WORLD : recentrage, rotation de repère, échelle de présentation, textures WebP, simplification et compression Meshopt. Aucun parrainage ou approbation des auteurs n’est suggéré. Cette attribution est également accessible dans le jeu, via Réglages → Crédits des modèles 3D, et dans les métadonnées GLB.

### Sources et textes conservés

| Source | Auteur | Licence | Texte vérifié |
|---|---|---|---|
| [Kenney — City Kit Commercial 2.1](https://kenney.nl/assets/city-kit-commercial) | Kenney | [CC0-1.0](https://creativecommons.org/publicdomain/zero/1.0/) | [Copie / référence](assets/library/licenses/kenney-commercial.txt) |
| [Kenney — Space Kit 2.0](https://kenney.nl/assets/space-kit) | Kenney | [CC0-1.0](https://creativecommons.org/publicdomain/zero/1.0/) | [Copie / référence](assets/library/licenses/kenney-space.txt) |
| [Kenney — Input Prompts 1.5A](https://kenney.nl/assets/input-prompts) | Kenney | [CC0-1.0](https://creativecommons.org/publicdomain/zero/1.0/) | [Copie / référence](assets/library/licenses/kenney-prompts.txt) |
| [Quaternius — Modular Sci-Fi MegaKit Standard FREE](https://quaternius.com/packs/modularscifimegakit.html) | Quaternius | [CC0-1.0](https://creativecommons.org/publicdomain/zero/1.0/) | [Copie / référence](assets/library/licenses/quaternius-scifi.txt) |
| [Quaternius — Downtown City MegaKit Standard FREE](https://quaternius.com/packs/downtowncitymegakit.html) | Quaternius | [CC0-1.0](https://creativecommons.org/publicdomain/zero/1.0/) | [Copie / référence](assets/library/licenses/quaternius-downtown.txt) |
| [Quaternius — Stylized Nature MegaKit Standard FREE](https://quaternius.com/packs/stylizednaturemegakit.html) | Quaternius | [CC0-1.0](https://creativecommons.org/publicdomain/zero/1.0/) | [Copie / référence](assets/library/licenses/quaternius-nature.txt) |
| [Poly Haven — Mountainside](https://polyhaven.com/a/mountainside) | Dario Barresi, Rico Cilliers | [CC0-1.0](https://creativecommons.org/publicdomain/zero/1.0/) | [Copie / référence](assets/library/licenses/polyhaven-cc0.txt) |
| [AMVLab Aircraft Models — variantes sans logos](https://github.com/amvlab/aircraft-models) | amvlab | [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/) | [Copie / référence](assets/library/licenses/amvlab-cc-by-4.0.txt) |

Seules les versions **Standard gratuites** des packs Quaternius ont été utilisées, par extraction ciblée de composants. Aucune version Pro ou Source payante. Les archives officielles Kenney contiennent leur notice CC0. Pour Poly Haven, le statut CC0 est confirmé par la page officielle de licence ; les sommes de contrôle des fichiers sources sont vérifiées par rapport à l’API.

### Modèles et adaptations

| Modèle | Origine | Usage dans cette PR | Licence |
|---|---|---|---|
| Tour Méridien A | Kenney — City Kit Commercial 2.1 | Horizon | CC0-1.0 |
| Tour Méridien C | Kenney — City Kit Commercial 2.1 | Horizon | CC0-1.0 |
| Tour Méridien E | Kenney — City Kit Commercial 2.1 | Horizon | CC0-1.0 |
| Relief Mountainside | Poly Haven — Mountainside | Horizon | CC0-1.0 |
| Avion sans logo | AMVLab Aircraft Models — variantes sans logos | Horizon | CC-BY-4.0 |
| eVTOL sans logo | AMVLab Aircraft Models — variantes sans logos | Horizon | CC-BY-4.0 |
| Drone sans logo | AMVLab Aircraft Models — variantes sans logos | Horizon | CC-BY-4.0 |
| Navette cargo | Kenney — Space Kit 2.0 | Horizon | CC0-1.0 |
| Pavillon modulaire Astra | Quaternius — Modular Sci-Fi MegaKit Standard FREE | Réserve, consultable dans le catalogue | CC0-1.0 |
| Pavillon spatial vitré | Kenney — Space Kit 2.0 | Réserve, consultable dans le catalogue | CC0-1.0 |
| Arbre feuillu | Quaternius — Stylized Nature MegaKit Standard FREE | Réserve, consultable dans le catalogue | CC0-1.0 |
| Pin | Quaternius — Stylized Nature MegaKit Standard FREE | Réserve, consultable dans le catalogue | CC0-1.0 |
| Buisson | Quaternius — Stylized Nature MegaKit Standard FREE | Réserve, consultable dans le catalogue | CC0-1.0 |

Le pavillon Astra assemble sept types de composants Quaternius Modular Sci-Fi et Downtown : panneaux vitrés, angles, colonnes, sol, encadrement. Sa provenance détaillée par composant est inscrite au manifeste. Les peintures chaudes de certains modules sont harmonisées en métal clair, anthracite et cyan ; les UV et détails de panneaux sont conservés.

Le relief est une **adaptation stylisée** de la capture Mountainside de Poly Haven : profil du fragment resculpté en crête, palette minérale bleutée, simplification et échelle de présentation. Il ne représente pas un massif topographique réel.

Les trois végétaux Quaternius sont conservés pour une future composition ; ils ne remplacent pas le décor actuel dans cette PR. Les 23 pictogrammes viennent de Kenney Input Prompts et sont conservés sans modification dans des SVG distincts. Aucune police ou icône distante supplémentaire.

## Logiciels

- Three.js r183, GLTFLoader, Sky et OrbitControls : [MIT](https://github.com/mrdoob/three.js/blob/r183/LICENSE).
- Meshoptimizer, Arseny Kapoulkine : [MIT](assets/library/licenses/meshoptimizer-mit.txt). Décodeur 1.3.0 chargé à la demande via jsDelivr.
- Outillage de préparation uniquement : glTF Transform (MIT), meshoptimizer (MIT), Sharp (Apache-2.0), glTF Validator (Apache-2.0). Ces outils ne sont pas nécessaires pour utiliser PLV WORLD dans Chrome.

## Ressources héritées et limites de provenance

L’audit des 30 fichiers préexistants (16 GLB, 2 HDRI et 12 JPG) est disponible dans [docs/assets-herites-audit.json](docs/assets-herites-audit.json). Aucun de ces fichiers n’est modifié.

- `assets/decor/LICENSE_Kenney.md` contient une déclaration MIT. Les pages officielles des packs Kenney indiquent CC0, mais les versions et membres précis correspondant à ces anciens fichiers ne sont pas documentés. **La déclaration héritée est conservée et ces 15 modèles ne sont pas requalifiés ni inclus dans la nouvelle sélection vérifiée.** Les nouveaux GLB Kenney proviennent directement des archives officielles avec leur propre notice CC0.
- Les deux HDRI renommés et les textures ambientCG sont déclarés CC0 dans PASSATION.md ; les identifiants de téléchargement individuels d’origine ne sont pas documentés. Cette limite est indiquée dans l’audit, sans inventer une provenance plus précise. Ils sont conservés.
- Le modèle QSJ et son fichier de métadonnées sont fournis par l’utilisateur, restent dans `assets/plv/` et sont **hors de la bibliothèque libre**. Aucune nouvelle licence ni nouvelle redistribution n’est présumée pour les PLV ou les créas.
- Le Parvis Méridien et les anciennes géométries procédurales d’interface et d’horizon sont des créations originales du projet ; visuels et géométries d’origine sous CC0. Les nouvelles adaptations de modèles tiers restent sous la licence de leur source.

Les captures de validation utilisent uniquement le contenu de démonstration déjà public du dépôt. Aucun inventaire réel ni document professionnel privé n’a été importé ou utilisé.
