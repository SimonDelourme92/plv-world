import test from 'node:test';
import assert from 'node:assert/strict';
import { SOLAR_BOX, BUILDINGS, STREETS, STREET, ROUNDABOUT, TRAM, FLECHE, insideSolar, solarDistricts } from '../assets/city/layout.js';
import { buildPlan, quartierSolids } from '../assets/city/quartier-plan.js';
import { createRoadNetwork, CITY } from '../assets/roads/network.js';

test('le quartier solarpunk est hors de la cité et hors des routes de campagne', () => {
  assert.ok(SOLAR_BOX.maxZ < CITY.minZ - 4.6, 'au sud du boulevard');
  for (const r of createRoadNetwork().roads) if (r.kind !== 'boulevard') for (const p of r.points) assert.ok(!insideSolar(p.x, p.z, 5), `${r.id} traverse le quartier`);
});

test('sept tours, dont une basse (≤ 20 m) et une de 400 m, toutes sur la dalle', () => {
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
  assert.equal(ROUNDABOUT, null, 'plan « dalle serrée » : plus de rond-point');
});

// Emprises au sol (x0, x1, z0, z1) des rues, du boulevard du tram et des tours.
const half = STREET.width / 2 + STREET.sidewalk;
const streetRects = () => STREETS.map(r => [Math.min(r.a[0], r.b[0]) - (r.ns ? half : 0), Math.max(r.a[0], r.b[0]) + (r.ns ? half : 0), Math.min(r.a[1], r.b[1]) - (r.ns ? 0 : half), Math.max(r.a[1], r.b[1]) + (r.ns ? 0 : half)]);
const tramRect = [TRAM.x0, TRAM.x1, TRAM.z - TRAM.half, TRAM.z + TRAM.half];
const r2 = s => [s.min.x, s.max.x, s.min.z, s.max.z];
const hit = (a, b, m = 0) => a[0] < b[1] - m && a[1] > b[0] + m && a[2] < b[3] - m && a[3] > b[2] + m;

test('La Flèche : 700 m, sur la dalle, ni sur une rue ni sur le tram ni sur une tour', () => {
  assert.equal(FLECHE.h, 700);
  for (const s of FLECHE.solids) { assert.ok(insideSolar(s.min.x, s.min.z) && insideSolar(s.max.x, s.max.z)); for (const r of [...streetRects(), tramRect]) assert.ok(!hit(r2(s), r), 'Flèche sur une rue'); for (const b of BUILDINGS) for (const t of b.solids) assert.ok(!hit(r2(s), r2(t)), 'Flèche sur ' + b.id); }
});

test('îlots : immeubles sur la dalle, hors rues, hors tram, hors tours, sans chevauchement', () => {
  const plan = buildPlan(), solids = plan.solids;
  assert.ok(plan.houses.length >= 100, 'quartier dense : ' + plan.houses.length);
  for (const h of plan.houses) { assert.ok(h.floors >= 4 && h.floors <= 9); assert.ok(h.fp[1] - h.fp[0] >= 6.3 && h.fp[3] - h.fp[2] >= 6.3); }
  for (const s of solids) {
    assert.ok(insideSolar(s.min.x + 0.01, s.min.z + 0.01) && insideSolar(s.max.x - 0.01, s.max.z - 0.01), 'hors dalle');
    for (const r of [...streetRects(), tramRect]) assert.ok(!hit(r2(s), r, 0.01), 'immeuble sur une rue ' + r2(s));
    for (const b of [...BUILDINGS.flatMap(b => b.solids), ...FLECHE.solids]) assert.ok(!hit(r2(s), r2(b), 0.01), 'immeuble sur une tour');
  }
  for (let i = 0; i < solids.length; i++) for (let j = i + 1; j < solids.length; j++) assert.ok(!hit(r2(solids[i]), r2(solids[j]), 0.01), 'chevauchement ' + i + '/' + j);
});

test('plan déterministe : mêmes emprises à chaque chargement', () => {
  assert.deepEqual(quartierSolids(), quartierSolids());
});

test('quartiers réservés : jamais dans la cité, loin dans l\'ordre d\'attribution des lots', () => {
  const blocked = solarDistricts(), d2 = i => ((i % 20) - 10) ** 2 + (Math.floor(i / 20) - 10) ** 2;
  const order = [...Array(400).keys()].filter(i => i !== 210 && i !== 190).sort((a, b) => d2(a) - d2(b) || a - b);
  assert.ok(blocked.size > 10);
  assert.ok(order.findIndex(i => blocked.has(i)) >= 40);
  for (const i of blocked) { const z = -1000 + Math.floor(i / 20) * 100; assert.ok(z + 100 <= CITY.minZ, 'quartier de cité réservé : ' + i); }
});
