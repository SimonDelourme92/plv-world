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

test("vehicle routes across open ground while avoiding buildings", () => {
  const building = { min: { x: -10, z: -40, y: 0 }, max: { x: 10, z: 30, y: 18 } };
  const destination = { x: 68, z: 62 };
  const route = router.route({ x: -76, z: -73 }, destination, { mode: "car", obstacles: [building] });
  assert.ok(route);
  assert.deepEqual(route.points.at(-1), destination);
  for (const p of route.points) assert.ok(p.x <= building.min.x || p.x >= building.max.x || p.z <= building.min.z || p.z >= building.max.z);
});

test("replanning from a point along the route produces a shorter remaining trip", () => {
  const goal = { x: 80, z: 80 };
  const first = router.route({ x: -80, z: -80 }, goal);
  const later = first.points[Math.floor(first.points.length * .65)];
  const updated = router.route(later, goal);
  assert.ok(updated);
  assert.ok(updated.distance < first.distance * .5);
});
