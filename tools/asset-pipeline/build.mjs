import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { Document, NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import {
  center,
  dedup,
  prune,
  weld,
  join,
  flatten,
  getBounds,
  meshopt,
  simplify,
  textureCompress,
  palette,
  mergeDocuments,
  unpartition,
  normals,
} from "@gltf-transform/functions";
import {
  MeshoptEncoder,
  MeshoptDecoder,
  MeshoptSimplifier,
} from "meshoptimizer";
import sharp from "sharp";
if (!process.argv[2])
  throw Error("Usage: node build.mjs SOURCE_DIR [OUTPUT_DIR]");
const sources = path.resolve(process.argv[2]);
const output =
  process.argv[3] || new URL("../../assets/library", import.meta.url).pathname;
const cacheDir = path.join(sources, "prepared-components");
await fs.mkdir(cacheDir, { recursive: true });
await fs.mkdir(output, { recursive: true });
await Promise.all([
  MeshoptEncoder.ready,
  MeshoptDecoder.ready,
  MeshoptSimplifier.ready,
]);
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({
    "meshopt.encoder": MeshoptEncoder,
    "meshopt.decoder": MeshoptDecoder,
  });
const hash = (b) => crypto.createHash("sha256").update(b).digest("hex");
const q = JSON.parse(
  await fs.readFile(path.join(sources, "quaternius-selection.json"), "utf8"),
);
function qpath(name) {
  const entry = q.find((e) => e.sourceFile.endsWith(name));
  return path.join(sources, entry.pack, entry.sourceFile);
}
function triangles(doc) {
  return doc
    .getRoot()
    .listMeshes()
    .reduce(
      (sum, m) =>
        sum +
        m
          .listPrimitives()
          .reduce(
            (s, p) =>
              s +
              (p.getIndices()?.getCount() ||
                p.getAttribute("POSITION").getCount()) /
                3,
            0,
          ),
      0,
    );
}
function bbox(doc) {
  const b = getBounds(doc.getRoot().getDefaultScene());
  return {
    min: b.min,
    max: b.max,
    dimensions: b.max.map((v, i) => v - b.min[i]),
  };
}
// Désature les peintures chaudes et conserve les détails de panneaux et de végétation.
async function recolorTexture(texture, mode) {
  const image = texture.getImage();
  if (!image) return;
  const { data, info } = await sharp(image)
    .resize({
      width: 512,
      height: 512,
      fit: "inside",
      withoutEnlargement: true,
    })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i],
      g = data[i + 1],
      b = data[i + 2];
    const l = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 255;
    if (mode === "mineral") {
      data[i] = Math.round(62 + l * 140);
      data[i + 1] = Math.round(78 + l * 144);
      data[i + 2] = Math.round(88 + l * 146);
    } else if (r > g * 1.15 && r > b * 1.1) {
      const v = 64 + l * 175;
      data[i] = Math.round(v * 0.96);
      data[i + 1] = Math.round(v * 0.99);
      data[i + 2] = Math.round(v);
    } else if (mode === "city" && b > r * 1.15) {
      data[i] = Math.round(32 + l * 90);
      data[i + 1] = Math.round(65 + l * 115);
      data[i + 2] = Math.round(83 + l * 120);
    }
  }
  texture
    .setImage(
      await sharp(data, { raw: info })
        .webp({ quality: 84, alphaQuality: 90 })
        .toBuffer(),
    )
    .setMimeType("image/webp");
}
async function prepare(file, style) {
  const doc = await io.read(file);
  if (style === "mineral") {
    // La capture d'origine est une portion de paroi rectangulaire : adaptation en crête.
    const bounds = getBounds(doc.getRoot().getDefaultScene()),
      mid = (bounds.min[0] + bounds.max[0]) / 2,
      half = (bounds.max[0] - bounds.min[0]) / 2,
      base = bounds.min[1];
    const visited = new Set();
    for (const mesh of doc.getRoot().listMeshes())
      for (const primitive of mesh.listPrimitives()) {
        const pos = primitive.getAttribute("POSITION"),
          normal = primitive.getAttribute("NORMAL");
        if (visited.has(pos)) continue;
        visited.add(pos);
        const value = [0, 0, 0],
          n = [0, 0, 0];
        for (let i = 0; i < pos.getCount(); i++) {
          pos.getElement(i, value);
          const u = (value[0] - mid) / half,
            v = Math.max(0, 1 - u * u),
            peak = 0.1 + 0.9 * Math.pow(v, 0.8),
            derivative =
              v > 1e-5 ? ((-0.9 * 0.8 * 2 * u) / half) * Math.pow(v, -0.2) : 0;
          if (normal) {
            normal.getElement(i, n);
            const nx = n[0] - (((value[1] - base) * derivative) / peak) * n[1],
              ny = n[1] / peak,
              nz = n[2],
              length = Math.hypot(nx, ny, nz) || 1;
            normal.setElement(i, [nx / length, ny / length, nz / length]);
          }
          value[1] = base + (value[1] - base) * peak;
          pos.setElement(i, value);
        }
      }
  }
  for (const animation of doc.getRoot().listAnimations()) animation.dispose();
  if (style === "scifi") {
    for (const m of doc.getRoot().listMaterials()) {
      if (/glass|window/i.test(m.getName())) {
        m.setBaseColorFactor([0.28, 0.49, 0.59, 0.62])
          .setAlphaMode("BLEND")
          .setMetallicFactor(0.35)
          .setRoughnessFactor(0.18);
      } else if (/dark/i.test(m.getName()))
        m.setBaseColorFactor([0.18, 0.24, 0.3, 1]).setRoughnessFactor(0.48);
      else if (/decal/i.test(m.getName()))
        m.setBaseColorFactor([0.37, 0.78, 0.85, 1]);
      else m.setRoughnessFactor(0.55).setMetallicFactor(0.15);
    }
  }
  if (style === "space")
    for (const m of doc.getRoot().listMaterials()) {
      m.setMetallicFactor(0.22).setRoughnessFactor(0.45);
      if (/red/i.test(m.getName())) m.setBaseColorFactor([0.34, 0.7, 0.77, 1]);
      else if (m.getName() === "dark")
        m.setBaseColorFactor([0.06, 0.12, 0.16, 1]);
      else if (/Dark/i.test(m.getName()))
        m.setBaseColorFactor([0.16, 0.22, 0.29, 1]);
      else m.setBaseColorFactor([0.85, 0.9, 0.94, 1]);
    }
  // Les images de couleur seules sont retouchées, jamais les normales ni les ORM.
  const colorTextures = new Set(
    doc
      .getRoot()
      .listMaterials()
      .map((m) => m.getBaseColorTexture())
      .filter(Boolean),
  );
  for (const t of colorTextures)
    if (["scifi", "city", "mineral"].includes(style))
      await recolorTexture(t, style);
  await doc.transform(
    textureCompress({
      encoder: sharp,
      targetFormat: "webp",
      resize: [512, 512],
    }),
    dedup(),
    prune(),
  );
  return doc;
}
async function pavilion() {
  const names = [
    "WallAstra_Straight_Window.gltf",
    "WallAstra_Corner_Square_Outer.gltf",
    "Column_Astra.gltf",
    "Platform_3Plates.gltf",
    "Door_Frame_SquareTall.gltf",
    "Metal_FullWindow.gltf",
    "Metal_Column_Center.gltf",
  ];
  const components = new Map();
  for (const name of names) {
    const doc = await prepare(qpath(name), "scifi");
    await doc.transform(center({ pivot: "below" }));
    components.set(name, doc);
  }
  const doc = new Document(),
    scene = doc.createScene("Pavillon Astra");
  doc.getRoot().setDefaultScene(scene);
  function place(name, x, y, z, yaw = 0) {
    const source = components.get(name),
      map = mergeDocuments(doc, source),
      imported = map.get(source.getRoot().getDefaultScene());
    const node = doc
      .createNode(name)
      .setTranslation([x, y, z])
      .setRotation([0, Math.sin(yaw / 2), 0, Math.cos(yaw / 2)]);
    for (const child of [...imported.listChildren()]) {
      imported.removeChild(child);
      node.addChild(child);
    }
    scene.addChild(node);
    imported.dispose();
  }
  for (const y of [0, 3])
    for (const z of [-2, 2])
      for (const side of [-1, 1])
        place(
          "WallAstra_Straight_Window.gltf",
          side * 4,
          y,
          z,
          side < 0 ? 0 : Math.PI,
        );
  for (const y of [0, 3])
    for (const x of [-2, 2])
      place("WallAstra_Straight_Window.gltf", x, y, -4, Math.PI / 2);
  for (const y of [0, 6.03])
    for (const x of [-2, 2])
      for (const z of [-2, 2]) place("Platform_3Plates.gltf", x, y, z);
  for (const x of [-3, 3])
    for (const y of [0, 3]) {
      place("Column_Astra.gltf", x, y, 4.05);
      place("Metal_FullWindow.gltf", x, y, 4.25);
    }
  for (const x of [-2.45, 2.45])
    for (const y of [0, 3]) place("Metal_Column_Center.gltf", x, y, 4.3);
  place("Door_Frame_SquareTall.gltf", 0, 0, 4.3);
  // Deux angles signent le couronnement arrière sans ajouter de primitive.
  for (const x of [-2, 2])
    place(
      "WallAstra_Corner_Square_Outer.gltf",
      x,
      3,
      -1.5,
      x < 0 ? 0 : Math.PI / 2,
    );
  for (const s of [...doc.getRoot().listScenes()]) if (s !== scene) s.dispose();
  await doc.transform(dedup(), prune(), unpartition());
  return doc;
}
const definitions = [
  ...["a", "c", "e"].map((v, i) => ({
    id: "tour-" + v,
    name: "Tour Méridien " + v.toUpperCase(),
    category: "skyline",
    file: path.join(
      sources,
      "kenney-selected/commercial/building-skyscraper-" + v + ".glb",
    ),
    provider: "kenney-commercial",
    style: "city",
    height: [155, 210, 245][i],
    runtime: true,
  })),
  {
    id: "relief-montagne",
    name: "Relief Mountainside",
    category: "relief",
    file: path.join(sources, "mountainside/mountainside.gltf"),
    provider: "polyhaven",
    style: "mineral",
    height: 260,
    runtime: true,
  },
  {
    id: "avion-a320",
    name: "Avion sans logo",
    category: "aeronef",
    file: path.join(sources, "A320_nologo.glb"),
    provider: "amvlab",
    style: "aircraft",
    rotateY: Math.PI / 2,
    runtime: true,
  },
  {
    id: "evtol",
    name: "eVTOL sans logo",
    category: "aeronef",
    file: path.join(sources, "EVTOL_nologo.glb"),
    provider: "amvlab",
    style: "aircraft",
    length: 12,
    runtime: true,
  },
  {
    id: "drone",
    name: "Drone sans logo",
    category: "aeronef",
    file: path.join(sources, "drone_nologo.glb"),
    provider: "amvlab",
    style: "aircraft",
    length: 6,
    runtime: true,
  },
  {
    id: "navette-cargo",
    name: "Navette cargo",
    category: "aeronef",
    file: path.join(sources, "kenney-selected/space/craft_cargoA.glb"),
    provider: "kenney-space",
    style: "space",
    length: 24,
    runtime: true,
  },
  {
    id: "pavillon-astra",
    name: "Pavillon modulaire Astra",
    category: "pavillon",
    provider: "quaternius-scifi",
    style: "scifi",
    assemble: true,
    runtime: false,
  },
  {
    id: "hangar-vitre",
    name: "Pavillon spatial vitré",
    category: "pavillon",
    file: path.join(sources, "kenney-selected/space/hangar_roundGlass.glb"),
    provider: "kenney-space",
    style: "space",
    length: 18,
    runtime: false,
  },
  {
    id: "arbre-feuillu",
    name: "Arbre feuillu",
    category: "vegetation",
    file: qpath("CommonTree_3.gltf"),
    provider: "quaternius-nature",
    style: "nature",
    runtime: false,
  },
  {
    id: "pin",
    name: "Pin",
    category: "vegetation",
    file: qpath("Pine_2.gltf"),
    provider: "quaternius-nature",
    style: "nature",
    runtime: false,
  },
  {
    id: "buisson",
    name: "Buisson",
    category: "vegetation",
    file: qpath("Bush_Common.gltf"),
    provider: "quaternius-nature",
    style: "nature",
    runtime: false,
  },
];
const assets = [];
for (const def of definitions) {
  const sourceDoc = def.assemble
    ? await pavilion()
    : await prepare(def.file, def.style);
  const originalBounds = bbox(sourceDoc),
    originalTriangles = triangles(sourceDoc);
  // Métadonnées explicites : l'échelle des décors ne concerne jamais les GLB de PLV.
  const root = sourceDoc.getRoot(),
    scene = root.getDefaultScene();
  const wrapper = sourceDoc.createNode(def.id + "-repere");
  for (const child of [...scene.listChildren()]) {
    scene.removeChild(child);
    wrapper.addChild(child);
  }
  scene.addChild(wrapper);
  if (def.rotateY)
    wrapper.setRotation([
      0,
      Math.sin(def.rotateY / 2),
      0,
      Math.cos(def.rotateY / 2),
    ]);
  const b = bbox(sourceDoc);
  const scale = def.height
    ? def.height / b.dimensions[1]
    : def.length
      ? def.length / Math.max(...b.dimensions)
      : 1;
  wrapper.setScale([scale, scale, scale]);
  await sourceDoc.transform(
    center({ pivot: def.category === "aeronef" ? "center" : "below" }),
    flatten(),
    dedup(),
    prune(),
    weld(),
    unpartition(),
  );
  const preparedFile = path.join(cacheDir, def.id + ".glb");
  await io.write(preparedFile, sourceDoc);
  const sourceBytes = def.file
    ? await fs.readFile(def.file)
    : await fs.readFile(preparedFile);
  const entry = {
    id: def.id,
    name: def.name,
    category: def.category,
    provider: def.provider,
    unit: "m",
    pivot: def.category === "aeronef" ? "center" : "centre-au-sol",
    upAxis: "Y",
    forwardAxis:
      def.category === "aeronef"
        ? def.id === "avion-a320"
          ? "-Z"
          : "+Z"
        : null,
    sourceModel: def.file
      ? path.relative(sources, def.file).replaceAll("\\", "/")
      : "assemblage-quaternius",
    sourceSha256: hash(sourceBytes),
    sourceTriangles: originalTriangles,
    sourceBounds: originalBounds,
    scaleApplied: scale,
    usage: def.runtime ? "horizon" : "reserve-bibliotheque",
    changes: [
      "Conversion GLB autonome",
      "Textures WebP plafonnées à 512 px",
      "Recentrage et échelle de présentation",
      "Meshopt et niveaux de détail",
      ...(["city", "scifi", "mineral", "space"].includes(def.style)
        ? ["Palette harmonisée pour PLV WORLD"]
        : []),
      ...(def.style === "mineral"
        ? ["Profil du fragment rocheux resculpté en crête stylisée"]
        : []),
    ],
    lods: [],
  };
  for (const level of [0, 1]) {
    const doc = await io.read(preparedFile);
    if (level === 1) {
      for (const m of doc.getRoot().listMaterials()) {
        m.setNormalTexture(null)
          .setOcclusionTexture(null)
          .setMetallicRoughnessTexture(null);
        if (m.getAlphaMode() === "BLEND") m.setAlphaMode("OPAQUE").setAlpha(1);
      }
    }
    await doc.transform(palette({ min: 2 }), join(), weld());
    const current = triangles(doc);
    let target =
      def.category === "relief"
        ? level === 0
          ? 9000
          : 1100
        : level === 0
          ? current
          : Math.min(900, current * 0.45);
    if (target < current * 0.98)
      await doc.transform(
        simplify({
          simplifier: MeshoptSimplifier,
          ratio: target / current,
          error: level === 0 ? 0.003 : 0.04,
        }),
      );
    await doc.transform(
      prune(),
      dedup(),
      textureCompress({
        encoder: sharp,
        targetFormat: "webp",
        resize: level === 0 ? [512, 512] : [256, 256],
      }),
      meshopt({ encoder: MeshoptEncoder, level: "high" }),
    );
    const author =
      def.provider === "amvlab"
        ? "amvlab"
        : def.provider.startsWith("quaternius")
          ? "Quaternius"
          : def.provider.startsWith("kenney")
            ? "Kenney"
            : "Poly Haven";
    const licenseUrl =
      def.provider === "amvlab"
        ? "https://creativecommons.org/licenses/by/4.0/"
        : "https://creativecommons.org/publicdomain/zero/1.0/";
    doc.getRoot().getAsset().copyright =
      author +
      " — " +
      (def.provider === "amvlab" ? "CC BY 4.0" : "CC0") +
      "; adaptations PLV WORLD; " +
      licenseUrl;
    doc
      .getRoot()
      .setExtras({
        plvAssetId: def.id,
        license: def.provider === "amvlab" ? "CC-BY-4.0" : "CC0-1.0",
        changes: entry.changes,
        licenseUrl,
        author,
      });
    const relative =
        "models/" + def.category + "/" + def.id + ".lod" + level + ".glb",
      dest = path.join(output, relative);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await io.write(dest, doc);
    const data = await fs.readFile(dest),
      bounds = bbox(doc);
    entry.lods.push({
      level,
      path: "assets/library/" + relative,
      bytes: data.length,
      sha256: hash(data),
      triangles: Math.round(triangles(doc)),
      primitives: doc
        .getRoot()
        .listMeshes()
        .reduce((n, m) => n + m.listPrimitives().length, 0),
      dimensions: bounds.dimensions.map((v) => +v.toFixed(5)),
      bounds: {
        min: bounds.min.map((v) => +v.toFixed(5)),
        max: bounds.max.map((v) => +v.toFixed(5)),
      },
      compression: "EXT_meshopt_compression",
      textures: "WebP " + (level === 0 ? "512" : "256") + " px maximum",
    });
    console.log(
      def.id,
      "LOD" + level,
      data.length,
      triangles(doc),
      "triangles",
    );
  }
  entry.dimensions = entry.lods[0].dimensions;
  assets.push(entry);
}
await fs.writeFile(
  path.join(output, "models-manifest.tmp.json"),
  JSON.stringify(assets, null, 2) + "\n",
);
