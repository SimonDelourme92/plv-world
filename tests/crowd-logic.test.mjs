import test from "node:test";
import assert from "node:assert/strict";
import {
  randomSeed,
  shouldRecycle,
  canSpawn,
  chooseNextLot,
  chooseStop,
  stopDuration,
} from "../assets/npc/crowd-logic.js";
const box = { min: { x: -1, z: -1 }, max: { x: 1, z: 1 } },
  records = [
    { lot: { id: "a" }, bounds: box },
    {
      lot: { id: "b" },
      bounds: { min: { x: 10, z: 10 }, max: { x: 12, z: 12 } },
    },
  ];
test("un arrêt reste hors des lots et de l’eau", () => {
  const stop = chooseStop(
    box,
    [box],
    (x, z) => (z < 0 ? -2 : 0),
    -0.9,
    () => 0,
  );
  assert.ok(stop);
  assert.ok(stop.z > 1);
  assert.equal(
    chooseStop(
      box,
      [box],
      () => -2,
      -0.9,
      () => 0,
    ),
    null,
  );
});
test("le lot précédent est exclu et les lots éloignés ignorés", () => {
  assert.equal(chooseNextLot(records, ["a"], 0, 0, () => 0).lot.id, "b");
  assert.equal(
    chooseNextLot(records, ["a", "b"], 0, 0, () => 0),
    null,
  );
});
test("recyclage et apparition respectent les distances", () => {
  assert.equal(shouldRecycle(161, 0, 0, 0), true);
  assert.equal(shouldRecycle(160, 0, 0, 0), false);
  assert.equal(
    canSpawn(20, 0, 0, 0, () => true),
    false,
  );
  assert.equal(
    canSpawn(20, 0, 0, 0, () => false),
    true,
  );
  assert.equal(
    canSpawn(36, 0, 0, 0, () => true),
    true,
  );
});
test("graine et durée sont déterministes", () => {
  const a = randomSeed(42),
    b = randomSeed(42);
  for (let i = 0; i < 50; i++) assert.equal(a(), b());
  const n = stopDuration(a);
  assert.ok(n >= 3 && n < 8);
});

test("un visiteur à l’arrêt s’écarte d’une voiture qui approche", async () => {
  const { vehicleSideStep } = await import("../assets/npc/crowd-logic.js");
  const target = { x: 0, z: 0 },
    car = { active: true, x: 0, z: 8, yaw: 0, speed: 10 };
  assert.equal(vehicleSideStep(0, 0, car, 0.2, target), true);
  assert.ok(target.x > 0.4);
  assert.equal(target.z, 0);
  assert.equal(vehicleSideStep(0, 0, { ...car, speed: 0 }, 0.2, target), false);
  assert.equal(vehicleSideStep(0, 0, { ...car, z: -8 }, 0.2, target), false);
});
