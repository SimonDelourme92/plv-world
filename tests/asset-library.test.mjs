import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
const root = path.resolve(import.meta.dirname, ".."),
  manifest = JSON.parse(
    await fs.readFile(path.join(root, "assets/library/manifest.json"), "utf8"),
  );
const hash = (b) => crypto.createHash("sha256").update(b).digest("hex");
test("bibliothèque : chemins locaux uniques, licences vérifiées et liens de preuve", async () => {
  const ids = new Set(),
    paths = new Set();
  for (const a of [...manifest.models, ...manifest.icons]) {
    assert(!ids.has(a.id));
    ids.add(a.id);
    assert(a.licenseVerified);
    const p = manifest.providers[a.provider];
    assert(p && p.license === a.license);
    assert.equal(a.licenseFile, p.licenseFile);
    for (const id of a.providers || [a.provider]) {
      const source = manifest.providers[id];
      assert(source.licenseVerified);
      assert.equal(source.license, a.license);
    }
    assert(p.url.startsWith("https://"));
    assert.equal(
      hash(await fs.readFile(path.join(root, p.licenseFile))),
      p.licenseSha256,
    );
    for (const file of a.lods || [a]) {
      assert(!paths.has(file.path));
      paths.add(file.path);
      assert(file.path.startsWith("assets/library/"));
      assert(!file.path.includes(".."));
      assert(!file.path.startsWith("data:"));
      const b = await fs.readFile(path.join(root, file.path));
      assert.equal(b.length, file.bytes);
      assert.equal(hash(b), file.sha256);
    }
  }
});
test("GLB autonomes : en-têtes valides, compression et métadonnées de licence", async () => {
  for (const a of manifest.models) {
    assert.deepEqual(
      a.lods.map((l) => l.level),
      [0, 1],
    );
    assert.equal(a.dimensions.length, 3);
    assert(a.dimensions.every((v) => Number.isFinite(v) && v > 0));
    for (const lod of a.lods) {
      const b = await fs.readFile(path.join(root, lod.path));
      assert.equal(b.toString("ascii", 0, 4), "glTF");
      assert.equal(b.readUInt32LE(4), 2);
      assert.equal(b.readUInt32LE(8), b.length);
      const g = JSON.parse(b.toString("utf8", 20, 20 + b.readUInt32LE(12)));
      assert(g.extensionsRequired?.includes("EXT_meshopt_compression"));
      assert.equal(g.extras.plvAssetId, a.id);
      assert.equal(g.extras.license, a.license);
      assert(g.extras.licenseUrl.startsWith("https://creativecommons.org/"));
      assert(
        g.asset.copyright.includes(a.provider === "amvlab" ? "amvlab" : "CC0"),
      );
      for (const ref of [...(g.buffers || []), ...(g.images || [])])
        assert(!ref.uri, "Toutes les ressources doivent être dans le GLB");
      assert(lod.triangles > 0);
      assert(lod.dimensions.every((v) => Number.isFinite(v) && v > 0));
    }
  }
});
test("icônes SVG : fichiers passifs sans scripts ni ressources distantes", async () => {
  for (const icon of manifest.icons) {
    const text = await fs.readFile(path.join(root, icon.path), "utf8");
    assert(text.includes("<svg"));
    assert(
      icon.dimensionsPixels?.length === 2 &&
        icon.dimensionsPixels.every((n) => n > 0),
    );
    assert(!/<script|<foreignObject|(?:href|src)=["']https?:\/\//i.test(text));
  }
});
test("budgets et séparation des PLV professionnelles", () => {
  assert.equal(manifest.models.length, 13);
  assert.equal(manifest.models.filter((m) => m.usage === "horizon").length, 8);
  assert(manifest.totals.modelBytes < 2_000_000);
  assert(manifest.totals.horizonBytes < 200_000);
  assert(!JSON.stringify(manifest.models).includes("assets/plv/"));
  assert(
    manifest.models.every((m) => ["CC0-1.0", "CC-BY-4.0"].includes(m.license)),
  );
});
