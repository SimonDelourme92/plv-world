import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import {
  dedup,
  prune,
  weld,
  meshopt,
  textureCompress,
  simplify,
} from "@gltf-transform/functions";
import {
  MeshoptEncoder,
  MeshoptDecoder,
  MeshoptSimplifier,
} from "meshoptimizer";
import sharp from "sharp";
await MeshoptEncoder.ready;
await MeshoptDecoder.ready;
await MeshoptSimplifier.ready;
if (!process.argv[2] || !process.argv[3])
  throw Error("Usage : node build-vehicle.mjs source.glb dossier-sortie");
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({
    "meshopt.encoder": MeshoptEncoder,
    "meshopt.decoder": MeshoptDecoder,
  });
for (const level of [0, 1]) {
  const doc = await io.read(process.argv[2]);
  doc.getRoot().getAsset().copyright =
    "Generic passenger car pack by Comrade1280 — CC BY 4.0 https://creativecommons.org/licenses/by/4.0/ ; modified for PLV WORLD: anthracite PBR, scale 4.7 m, wheel pivots, compression.";
  await doc.transform(
    dedup(),
    weld(),
    ...(level
      ? [simplify({ simplifier: MeshoptSimplifier, ratio: 0.5, error: 0.001 })]
      : []),
    textureCompress({
      encoder: sharp,
      targetFormat: "webp",
      resize: level ? [512, 512] : [1024, 1024],
    }),
    prune(),
    meshopt({ encoder: MeshoptEncoder, level: "medium" }),
  );
  await io.write(process.argv[3] + "/sedan.lod" + level + ".glb", doc);
  console.log(
    "LOD",
    level,
    doc
      .getRoot()
      .listNodes()
      .map((n) => n.getName()),
  );
}
