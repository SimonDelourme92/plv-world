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

test('ATLAS : emplacements de rangement des PLV sous la masse, libres de tout pilier', async () => {
  const { ATLAS_SLOTS, atlasHeights, NX, NZ, CELL } = await import('../assets/city/atlas-layout.js');
  const solids = atlasSolids().filter(s => s.min.y < 3), h = atlasHeights();
  for (const s of ATLAS_SLOTS) {
    const r = [s.x, s.x + s.w, s.z, s.z + s.d];
    for (const o of solids) assert.ok(!(r[0] < o.max.x + 1 && r[1] > o.min.x - 1 && r[2] < o.max.z + 1 && r[3] > o.min.z - 1), `${s.id} touche un pilier, un noyau ou une marche`);
    // chaque coin est sous un module habité (pas dans la cour ouverte ni hors emprise)
    for (const [x, z] of [[r[0], r[2]], [r[1], r[2]], [r[0], r[3]], [r[1], r[3]], [(r[0] + r[1]) / 2, (r[2] + r[3]) / 2]]) {
      const lx = -(z - (-195)), lz = x - 536, i = Math.round(lx / CELL + (NX - 1) / 2), j = Math.round(lz / CELL + (NZ - 1) / 2);
      assert.ok(h.has(i + ',' + j), `${s.id} : (${x}, ${z}) n’est pas sous le bâtiment`);
    }
  }
  // le lot actuel (84 × 44 m) tient dans le premier emplacement
  assert.ok(ATLAS_SLOTS[0].w >= 84 && ATLAS_SLOTS[0].d >= 44);
});
