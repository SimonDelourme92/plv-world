import test from 'node:test';
import assert from 'node:assert/strict';
import { SOLAR_BOX, BUILDINGS, STREETS, STREET, ROUNDABOUT, insideSolar, solarDistricts } from '../assets/city/layout.js';
import { createRoadNetwork, CITY } from '../assets/roads/network.js';

test('le quartier solarpunk est hors de la cité et hors des routes de campagne', () => {
  assert.ok(SOLAR_BOX.maxZ < CITY.minZ - 4.6, 'au sud du boulevard');
  for (const r of createRoadNetwork().roads) if (r.kind !== 'boulevard') for (const p of r.points) assert.ok(!insideSolar(p.x, p.z, 5), `${r.id} traverse le quartier`);
});

test('sept bâtiments, dont un bas (≤ 20 m) et un de 400 m, tous sur la dalle', () => {
  assert.equal(BUILDINGS.length, 7);
  assert.ok(BUILDINGS.some(b => b.h <= 20) && BUILDINGS.some(b => b.h === 400));
  for (const b of BUILDINGS) for (const s of b.solids) assert.ok(insideSolar(s.min.x, s.min.z) && insideSolar(s.max.x, s.max.z), b.id);
});

test('aucune rue ne traverse un bâtiment', () => {
  const half = STREET.width / 2 + STREET.sidewalk;
  for (const r of STREETS) {
    const x0 = Math.min(r.a[0], r.b[0]) - (r.ns ? half : 0), x1 = Math.max(r.a[0], r.b[0]) + (r.ns ? half : 0), z0 = Math.min(r.a[1], r.b[1]) - (r.ns ? 0 : half), z1 = Math.max(r.a[1], r.b[1]) + (r.ns ? 0 : half);
    for (const b of BUILDINGS) for (const s of b.solids) assert.ok(s.max.x <= x0 || s.min.x >= x1 || s.max.z <= z0 || s.min.z >= z1, `rue ${r.a}→${r.b} sur ${b.id}`);
  }
  const phare = BUILDINGS.find(b => b.id === 'phare').solids[0];
  assert.ok(Math.hypot(phare.max.x - ROUNDABOUT.x, phare.max.z - ROUNDABOUT.z) < ROUNDABOUT.r - STREET.width / 2 - STREET.sidewalk);
});

test('quartiers réservés : jamais dans la cité, loin dans l\'ordre d\'attribution des lots', () => {
  const blocked = solarDistricts(), d2 = i => ((i % 20) - 10) ** 2 + (Math.floor(i / 20) - 10) ** 2;
  const order = [...Array(400).keys()].filter(i => i !== 210 && i !== 190).sort((a, b) => d2(a) - d2(b) || a - b);
  assert.ok(blocked.size > 10);
  assert.ok(order.findIndex(i => blocked.has(i)) >= 40);
  for (const i of blocked) { const z = -1000 + Math.floor(i / 20) * 100; assert.ok(z + 100 <= CITY.minZ, 'quartier de cité réservé : ' + i); }
});
