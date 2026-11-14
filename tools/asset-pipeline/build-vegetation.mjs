// Construit les espèces végétales du paysage à partir du Stylized Nature MegaKit
// (Quaternius, version Standard gratuite, CC0). Même traitement que build.mjs :
// pivot au sol, textures WebP, meshopt, LOD0/LOD1. N'écrit que models/vegetation/.
// Usage : node build-vegetation.mjs SOURCES_DIR  (SOURCES_DIR/stylized-nature-megakit/glTF/*.gltf)
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { center, dedup, prune, weld, join, flatten, getBounds, meshopt, simplify, textureCompress, palette, unpartition } from "@gltf-transform/functions";
import { MeshoptEncoder, MeshoptDecoder, MeshoptSimplifier } from "meshoptimizer";
import sharp from "sharp";

if (!process.argv[2]) throw Error("Usage: node build-vegetation.mjs SOURCES_DIR");
const sources = path.resolve(process.argv[2]);
const library = new URL("../../assets/library", import.meta.url).pathname;
await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready, MeshoptSimplifier.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.encoder": MeshoptEncoder, "meshopt.decoder": MeshoptDecoder });
const hash = (b) => crypto.createHash("sha256").update(b).digest("hex");
const triangles = (doc) => doc.getRoot().listMeshes().reduce((s, m) => s + m.listPrimitives().reduce((n, p) => n + (p.getIndices()?.getCount() ?? p.getAttribute("POSITION").getCount()) / 3, 0), 0);
const bbox = (doc) => { const b = getBounds(doc.getRoot().getDefaultScene()); return { min: b.min, max: b.max, dimensions: b.max.map((v, i) => v - b.min[i]) }; };

export const SPECIES = [
  { id: "feuillu-rond", name: "Feuillu rond", member: "CommonTree_1" },
  { id: "feuillu-eleve", name: "Feuillu élevé", member: "CommonTree_4" },
  { id: "pin-touffu", name: "Pin touffu", member: "Pine_4" },
  { id: "arbre-tordu", name: "Arbre tordu", member: "TwistedTree_1" },
  { id: "arbre-tordu-large", name: "Arbre tordu large", member: "TwistedTree_3" },
  { id: "arbre-mort", name: "Arbre mort", member: "DeadTree_2" },
  { id: "buisson-fleuri", name: "Buisson fleuri", member: "Bush_Common_Flowers" },
  { id: "fougere", name: "Fougère", member: "Fern_1" },
  { id: "rocher-moyen", name: "Rocher moyen", member: "Rock_Medium_1" },
  { id: "rocher-plat", name: "Rocher plat", member: "Rock_Medium_3" },
];
const LICENSE_URL = "https://creativecommons.org/publicdomain/zero/1.0/";
const entries = [];
for (const def of SPECIES) {
  const file = path.join(sources, "stylized-nature-megakit/glTF", def.member + ".gltf");
  const sourceDoc = await io.read(file);
  for (const a of sourceDoc.getRoot().listAnimations()) a.dispose();
  const originalBounds = bbox(sourceDoc), originalTriangles = triangles(sourceDoc);
  await sourceDoc.transform(center({ pivot: "below" }), flatten(), dedup(), prune(), weld(), unpartition(), textureCompress({ encoder: sharp, targetFormat: "webp", resize: [512, 512] }));
  const prepared = await io.writeBinary(sourceDoc);
  const entry = {
    id: def.id, name: def.name, category: "vegetation", provider: "quaternius-nature", unit: "m", pivot: "centre-au-sol", upAxis: "Y",
    sourceModel: "stylized-nature-megakit/glTF/" + def.member + ".gltf", sourceSha256: hash(await fs.readFile(file)),
    sourceTriangles: Math.round(originalTriangles), sourceBounds: originalBounds, scaleApplied: 1, usage: "paysage",
    changes: ["Conversion GLB autonome", "Textures WebP plafonnées à 512 px", "Recentrage au sol", "Meshopt et niveaux de détail"], lods: [],
  };
  for (const level of [0, 1]) {
    const doc = await io.readBinary(prepared);
    if (level === 1) for (const m of doc.getRoot().listMaterials()) m.setNormalTexture(null).setOcclusionTexture(null).setMetallicRoughnessTexture(null);
    await doc.transform(palette({ min: 2 }), join(), weld());
    const current = triangles(doc), target = level === 0 ? current : Math.min(700, current * 0.3);
    if (target < current * 0.98) await doc.transform(simplify({ simplifier: MeshoptSimplifier, ratio: target / current, error: level === 0 ? 0.003 : 0.3 }));
    await doc.transform(prune(), dedup(), textureCompress({ encoder: sharp, targetFormat: "webp", resize: level === 0 ? [512, 512] : [256, 256] }), meshopt({ encoder: MeshoptEncoder, level: "high" }));
    doc.getRoot().getAsset().copyright = "Quaternius — CC0; adaptations PLV WORLD; " + LICENSE_URL;
    doc.getRoot().setExtras({ plvAssetId: def.id, license: "CC0-1.0", changes: entry.changes, licenseUrl: LICENSE_URL, author: "Quaternius" });
    const relative = "models/vegetation/" + def.id + ".lod" + level + ".glb", dest = path.join(library, relative);
    await io.write(dest, doc);
    const data = await fs.readFile(dest), b = bbox(doc);
    entry.lods.push({
      level, path: "assets/library/" + relative, bytes: data.length, sha256: hash(data), triangles: Math.round(triangles(doc)),
      primitives: doc.getRoot().listMeshes().reduce((n, m) => n + m.listPrimitives().length, 0),
      dimensions: b.dimensions.map((v) => +v.toFixed(5)), bounds: { min: b.min.map((v) => +v.toFixed(5)), max: b.max.map((v) => +v.toFixed(5)) },
      compression: "EXT_meshopt_compression", textures: "WebP " + (level === 0 ? "512" : "256") + " px maximum",
    });
    console.log(def.id, "LOD" + level, data.length, "octets", Math.round(triangles(doc)), "triangles");
  }
  Object.assign(entry, {
    dimensions: entry.lods[0].dimensions, license: "CC0-1.0", licenseVerified: true, licenseFile: "assets/library/licenses/quaternius-nature.txt",
    sourceUrl: "https://quaternius.com/packs/stylizednaturemegakit.html", sourceArchiveMember: "glTF/" + def.member + ".gltf", runtimeLod: null, forwardAxis: null,
  });
  entries.push(entry);
}
// Fusion dans le manifeste : remplace les entrées de même id, met à jour les totaux.
const manifestPath = path.join(library, "manifest.json");
const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
for (const e of entries) {
  const i = manifest.models.findIndex((m) => m.id === e.id);
  if (i >= 0) manifest.models[i] = e; else manifest.models.push(e);
}
manifest.totals.models = manifest.models.length;
manifest.totals.modelVariants = manifest.models.reduce((n, m) => n + m.lods.length, 0);
manifest.totals.modelBytes = manifest.models.reduce((n, m) => n + m.lods.reduce((s, l) => s + l.bytes, 0), 0);
await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
console.log(entries.length, "espèces ajoutées au manifeste");
