import test from 'node:test';
import assert from 'node:assert/strict';
import { createRoadNetwork } from '../assets/roads/network.js';

test('réseau routier déterministe et hors des réservations', () => {
  const reservations = [{ min: { x: -10, z: -10 }, max: { x: 10, z: 10 } }];
  const network = createRoadNetwork({ reservations, water: () => false });
  const base = createRoadNetwork({ water: () => false });
  assert.ok(base.roads.length >= 4);
  assert.deepEqual(base.roads, createRoadNetwork({ water: () => false }).roads);
  for (const road of network.roads) for (const point of road.points) {
    assert.ok(Math.hypot(Math.max(-10 - point.x, 0, point.x - 10), Math.max(-10 - point.z, 0, point.z - 10)) >= road.width / 2 + 6);
  }
});
