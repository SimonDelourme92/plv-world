import test from 'node:test';
import assert from 'node:assert/strict';
import { scatterNature } from '../assets/nature/scatter.js';
test('végétation déterministe et réservations respectées', () => {
  const box = { min: { x: -20, z: -20 }, max: { x: 20, z: 20 } };
  const a = scatterNature({ reservations: [box], routes: [], water: (x, z) => x < -300 && z < 0, density: 'low' });
  const b = scatterNature({ reservations: [box], routes: [], water: (x, z) => x < -300 && z < 0, density: 'low' });
  assert.deepEqual(a, b); assert.ok(a.every(p => !(p.x > -28 && p.x < 28 && p.z > -28 && p.z < 28)));
  assert.ok(new Set(a.map(p => p.species)).size >= 3);
});
