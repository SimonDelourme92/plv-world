import test from "node:test";
import assert from "node:assert/strict";
import { createHeightField } from "../assets/terrain/height.js";
test("pilot terrain is deterministic, bounded, and preserves every road", () => {
  const h = createHeightField();
  let max = 0;
  for (let x = 200; x <= 500; x += 2)
    for (let z = 200; z <= 500; z += 2) {
      const y = h(x, z);
      assert.equal(y, h(x, z));
      assert.ok(Number.isFinite(y));
      max = Math.max(max, y);
      if (x % 100 === 0 || z % 100 === 0) assert.equal(y, 0);
    }
  assert.ok(max > 40 && max < 65);
  assert.equal(h(199, 250), 0);
  assert.equal(h(501, 450), 0);
});
test("new lots flatten the terrain without changing the reservation coordinates", () => {
  const boxes = [];
  const h = createHeightField(() => boxes);
  assert.ok(h(250, 250) > 5);
  const b = { min: { x: 240, z: 240 }, max: { x: 260, z: 260 } };
  boxes.push(b);
  for (let x = 240; x <= 260; x += 2)
    for (let z = 240; z <= 260; z += 2) assert.equal(h(x, z), 0);
  assert.deepEqual(b, { min: { x: 240, z: 240 }, max: { x: 260, z: 260 } });
});
