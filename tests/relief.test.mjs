import test from 'node:test';
import assert from 'node:assert/strict';
import { createRelief } from '../assets/terrain/relief.js';

test('relief déterministe et réservations planes', () => {
  const box = { min: { x: -20, z: -15 }, max: { x: 20, z: 15 } };
  const relief = createRelief({ reservations: () => [box] });
  assert.equal(relief(0, 0), 0);
  assert.equal(relief(10, 10), 0);
  assert.equal(relief(321, -117), createRelief() (321, -117));
});

test('relief reste borné et varie sans motif régulier', () => {
  const relief = createRelief();
  const values = [-900, -450, 0, 450, 900].flatMap(x => [-900, -450, 0, 450, 900].map(z => relief(x, z)));
  assert.ok(values.every(value => value >= -4 && value <= 45));
  assert.ok(new Set(values.map(value => value.toFixed(2))).size > 8);
});

test('la cité reste plane, la campagne a du relief', async () => {
  const { RELIEF_CITY } = await import('../assets/terrain/relief.js');
  const relief = createRelief();
  for (let x = RELIEF_CITY.minX; x <= RELIEF_CITY.maxX; x += 25) for (let z = RELIEF_CITY.minZ; z <= RELIEF_CITY.maxZ; z += 25) assert.equal(relief(x, z), 0);
  let max = 0; for (let x = -900; x <= 900; x += 60) max = Math.max(max, Math.abs(relief(x, -850)), Math.abs(relief(-850, x)));
  assert.ok(max > 8, 'collines visibles en périphérie');
});
