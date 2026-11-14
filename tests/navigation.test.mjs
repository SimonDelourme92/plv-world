import test from "node:test";
import assert from "node:assert/strict";
import { NavigationRouter } from "../assets/navigation/navigation.js";

const router = new NavigationRouter({ halfExtent: 100, cellSize: 10, districtSize: 100 });

test("walking route connects distant districts and avoids a building footprint", () => {
  const building = { min: { x: -10, z: -40, y: 0 }, max: { x: 10, z: 30, y: 18 } };
  const route = router.route({ x: -78, z: -72 }, { x: 74, z: 68 }, { obstacles: [building] });
  assert.ok(route);
  assert.deepEqual(route.points[0], { x: -78, z: -72 });
  assert.deepEqual(route.points.at(-1), { x: 74, z: 68 });
  assert.ok(route.distance > Math.hypot(152, 140));
  for (const point of route.points.slice(1, -1)) {
    assert.ok(point.x <= building.min.x || point.x >= building.max.x || point.z <= building.min.z || point.z >= building.max.z);
  }
});

test("vehicle route stays on the street grid and snaps to accessible road parking", () => {
  const route = router.route({ x: -76, z: -73 }, { x: 68, z: 62 }, { mode: "car" });
  assert.ok(route);
  assert.equal(route.mode, "car");
  const end = route.points.at(-1);
  const roadOffset = Math.min(Math.abs(end.x % 100), Math.abs(end.z % 100));
  assert.ok(roadOffset <= 0.1, `parking endpoint should lie on a 100 m street axis, got ${JSON.stringify(end)}`);
  for (const point of route.points.slice(1, -1)) {
    const dx = Math.abs(((point.x + 100) % 100));
    const dz = Math.abs(((point.z + 100) % 100));
    assert.ok(Math.min(dx, 100 - dx, dz, 100 - dz) <= 5.1);
  }
});

test("replanning from a point along the route produces a shorter remaining trip", () => {
  const goal = { x: 80, z: 80 };
  const first = router.route({ x: -80, z: -80 }, goal);
  const later = first.points[Math.floor(first.points.length * .65)];
  const updated = router.route(later, goal);
  assert.ok(updated);
  assert.ok(updated.distance < first.distance * .5);
});
