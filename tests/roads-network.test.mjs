import test from 'node:test';
import assert from 'node:assert/strict';
import { createRoadNetwork } from '../assets/roads/network.js';

test('réseau routier déterministe et hors des réservations', () => {
  const reservations = [{ min: { x: -10, z: -10 }, max: { x: 10, z: 10 } }];
  const network = createRoadNetwork({ reservations, water: () => false });
  const base = createRoadNetwork({ water: () => false });
  assert.equal(base.roads.length, 4);
  assert.deepEqual(base.roads, createRoadNetwork({ water: () => false }).roads);
  assert.ok(network.roads.length < base.roads.length);
});
