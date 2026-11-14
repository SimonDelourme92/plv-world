import test from 'node:test';
import assert from 'node:assert/strict';
import { scatterNature, SPECIES } from '../assets/nature/scatter.js';
import { CITY } from '../assets/roads/network.js';

const water = (x, z) => x < -300 && x > -400 && z < 0;
const road = (x, z) => Math.abs(z - 600) - 3; // route fictive horizontale à z = 600
const opts = { density: 'low', city: CITY, isWater: water, roadDistance: road };

test('végétation déterministe, variée', () => {
  const a = scatterNature(opts), b = scatterNature(opts);
  assert.deepEqual(a, b);
  assert.ok(a.count > 3000);
  assert.ok(new Set(a.species).size >= 10, 'au moins dix espèces');
  assert.ok(scatterNature({ ...opts, density: 'medium' }).count > a.count * 1.8);
  assert.equal(scatterNature({ ...opts, density: 'off' }).count, 0);
});

test('rien dans la cité, sur les routes ni dans l\'eau', () => {
  const a = scatterNature(opts);
  for (let i = 0; i < a.count; i++) {
    const x = a.x[i], z = a.z[i], kind = SPECIES[a.species[i]].kind;
    assert.ok(!(x > CITY.minX && x < CITY.maxX && z > CITY.minZ && z < CITY.maxZ), 'dans la cité');
    assert.ok(!water(x, z), 'dans l\'eau');
    assert.ok(road(x, z) >= (kind === 'tree' ? 3.5 : 1), 'sur la route');
  }
});

test('alignement du boulevard côté campagne', () => {
  const boulevard = Array.from({ length: 300 }, (_, i) => ({ x: CITY.minX + i * 2, z: CITY.minZ }));
  const a = scatterNature({ ...opts, boulevard }), alley = [];
  for (let i = 0; i < a.count; i++) if (Math.abs(a.z[i] - (CITY.minZ - 10)) < 0.01) alley.push(a.x[i]);
  assert.ok(alley.length > 20);
});
