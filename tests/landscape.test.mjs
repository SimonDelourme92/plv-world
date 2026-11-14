import test from "node:test";
import assert from "node:assert/strict";
import { createPlantingPlan } from "../assets/landscape/plan.js";
const plan = createPlantingPlan();
const overlaps = (a, b) =>
  a.min.x < b.max.x &&
  a.max.x > b.min.x &&
  a.min.z < b.max.z &&
  a.max.z > b.min.z;
const rect = (x, z, w, d) => ({
  min: { x: x - w / 2, z: z - d / 2 },
  max: { x: x + w / 2, z: z + d / 2 },
});
test("Plan déterministe, cinq modèles du catalogue, variantes bornées", () => {
  assert.deepEqual(plan, createPlantingPlan());
  assert.equal(new Set(plan.map((p) => p.id)).size, 5);
  assert.equal(
    plan.filter((p) => p.id.includes("pavillon") || p.id === "hangar-vitre")
      .length,
    3,
  );
  for (const p of plan) assert(p.scale > 0 && p.scale <= 1);
});
test("Aucune emprise sur les routes ou les réservations PLV, même vides", () => {
  for (const p of plan) {
    const b = p.bounds;
    if (p.zone === "central") {
      assert(
        b.min.x >= 4.5 && b.max.x <= 95.5 && b.min.z >= 4.5 && b.max.z <= 95.5,
      );
      assert(!overlaps(b, rect(50, 50, 13, 91)), JSON.stringify(p));
      assert(!overlaps(b, rect(50, 52, 91, 11)), JSON.stringify(p));
    } else {
      const x = Math.floor(p.x / 100) * 100,
        z = Math.floor(p.z / 100) * 100;
      assert(
        b.min.x >= x + 4 &&
          b.max.x <= x + 96 &&
          b.min.z >= z + 4 &&
          b.max.z <= z + 96,
      );
      assert(!overlaps(b, rect(x + 50, z + 50, 90.8, 90.8)));
      assert(!(x === 0 && z === -100), "cellule test intacte");
    }
  }
});
test("Bâtiments, portique et repères du pilote dégagés", () => {
  const fixed = [
    [19, 17, 23, 23],
    [76, 17, 30, 21],
    [12, 38, 14, 17],
    [87, 39, 17, 20],
    [15, 83, 21, 21],
    [86, 84, 20, 20],
    [41.6, 50.25, 5.6, 3],
    [58.4, 48.25, 5.6, 3],
    [37.8, 56.4, 0.75, 0.55],
    [44.8, 58.6, 1.2, 0.8],
    [62.5, 58.5, 2.55, 13.6],
  ];
  for (const p of plan.filter((p) => p.zone === "central"))
    for (const a of fixed)
      assert(!overlaps(p.bounds, rect(...a)), `${p.id} ${p.x},${p.z} / ${a}`);
  const pavilions = plan.filter(
    (p) => p.id.includes("pavillon") || p.id === "hangar-vitre",
  );
  for (const a of pavilions)
    for (const b of plan)
      if (a !== b)
        assert(
          !overlaps(a.bounds, b.bounds),
          `${a.id} / ${b.id} ${b.x},${b.z}`,
        );
});
