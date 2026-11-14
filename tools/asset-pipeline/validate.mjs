import validator from "gltf-validator";
import fs from "node:fs/promises";
import path from "node:path";
const root = new URL("../../", import.meta.url).pathname,
  manifest = JSON.parse(
    await fs.readFile(path.join(root, "assets/library/manifest.json")),
  ),
  report = [];
for (const a of manifest.models)
  for (const lod of a.lods) {
    const bytes = await fs.readFile(path.join(root, lod.path));
    const v = await validator.validateBytes(new Uint8Array(bytes), {
      uri: lod.path,
      maxIssues: 100,
    });
    report.push({
      id: a.id,
      lod: lod.level,
      errors: v.issues.numErrors,
      warnings: v.issues.numWarnings,
      codes: [...new Set(v.issues.messages.map((m) => m.code))],
    });
    if (v.issues.numErrors)
      console.log(
        a.id,
        lod.level,
        v.issues.messages.filter((m) => m.severity === 0),
      );
  }
await fs.writeFile(
  process.argv[2] || "/tmp/plv-gltf-validation.json",
  JSON.stringify(report, null, 2),
);
console.log({
  models: report.length,
  errors: report.reduce((n, r) => n + r.errors, 0),
  warnings: report.reduce((n, r) => n + r.warnings, 0),
});
if (report.some((r) => r.errors)) process.exit(1);
