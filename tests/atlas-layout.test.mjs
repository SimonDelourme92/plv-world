import test from 'node:test';
import assert from 'node:assert/strict';
import { ATLAS_PLAZA, atlasSolids, atlasDistricts, atlasHeights, insideAtlas, toWorld } from '../assets/city/atlas-layout.js';
import { SOLAR_BOX } from '../assets/city/layout.js';
import { createRoadNetwork, CITY } from '../assets/roads/network.js';

test('ATLAS : parvis à côté du quartier solarpunk, hors cité, hors dalle', () => {
  const P = ATLAS_PLAZA;
  assert.ok(P.minX > CITY.maxX + 5, 'à l’est de la cité');
  assert.ok(P.minX > SOLAR_BOX.maxX + 10, 'ne touche pas la dalle');
  assert.ok(Math.hypot(P.minX - SOLAR_BOX.maxX, Math.max(0, P.minZ - SOLAR_BOX.maxZ)) < 60, 'à côté de la dalle');
  assert.ok(P.maxX < 790 && P.minZ > -790, 'dans le domaine jouable');
});

test('ATLAS : aucune route ne passe sur le parvis (marge 5 m)', () => {
  for (const r of createRoadNetwork().roads) for (const p of r.points) assert.ok(!insideAtlas(p.x, p.z, r.width / 2 + 5), `${r.id} traverse le parvis (${p.x.toFixed(0)}, ${p.z.toFixed(0)})`);
});

test('ATLAS : modules et emprises conformes à l’étude (306 × 198 m, ~162 m)', () => {
  const h = atlasHeights(); assert.equal(h.size, 34 * 22 - 16 * 8); // grande cour ouverte au centre
  const top = Math.max(...atlasSolids().map(s => s.max.y)); assert.ok(top > 160 && top < 170, 'hauteur ' + top);
  for (const s of atlasSolids()) assert.ok(insideAtlas(s.min.x, s.min.z, 0.01) && insideAtlas(s.max.x, s.max.z, 0.01));
  const [ax, az] = toWorld(-153, -99), [bx, bz] = toWorld(153, 99); assert.equal(Math.abs(bx - ax), 198); assert.equal(Math.abs(bz - az), 306);
});

test('ATLAS : on passe sous la masse (≥ 16 m libres) entre les piliers', () => {
  const mass = atlasSolids().filter(s => s.min.y > 10); assert.ok(mass.length > 30); for (const s of mass) assert.ok(s.min.y >= 16);
});

test('ATLAS : quartiers réservés hors cité et loin dans l’ordre d’attribution des lots', () => {
  const blocked = atlasDistricts(), d2 = i => ((i % 20) - 10) ** 2 + (Math.floor(i / 20) - 10) ** 2;
  const order = [...Array(400).keys()].filter(i => i !== 210 && i !== 190).sort((a, b) => d2(a) - d2(b) || a - b);
  assert.ok(order.findIndex(i => blocked.has(i)) >= 40);
  for (const i of blocked) { const x = -1000 + (i % 20) * 100; assert.ok(x >= CITY.maxX, 'quartier de cité réservé : ' + i); }
});
