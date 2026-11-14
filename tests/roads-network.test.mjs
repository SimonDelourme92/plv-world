import test from 'node:test';
import assert from 'node:assert/strict';
import { createRoadNetwork, blockedDistricts, profileNetwork, createRoadField, CITY } from '../assets/roads/network.js';
import { createRelief } from '../assets/terrain/relief.js';
import { riverbedHeight } from '../assets/river/riverbed.js';

const relief = createRelief();
const natural = (x, z) => { const bed = riverbedHeight(x, z, []); return bed + relief(x, z) * Math.min(1, Math.max(0, (bed + 0.5) / 0.5)); };
const isWater = (x, z) => riverbedHeight(x, z, []) < -0.35;
const build = () => profileNetwork(createRoadNetwork(), { natural, isWater });

test('réseau déterministe : boulevard, boucle et quatre liaisons', () => {
  const a = createRoadNetwork(), b = createRoadNetwork();
  assert.deepEqual(a.roads, b.roads);
  assert.deepEqual(a.roads.map(r => r.id), ['boulevard', 'boucle', 'route-nord', 'route-est', 'route-sud', 'route-ouest']);
});

test('le boulevard reste dans les allées : aucun intérieur de quartier touché', () => {
  const ring = createRoadNetwork().roads[0];
  for (const p of ring.points) {
    const ix = Math.floor((p.x + 1000) / 100), iz = Math.floor((p.z + 1000) / 100);
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      const x0 = -1000 + (ix + dx) * 100 + 4.6, z0 = -1000 + (iz + dz) * 100 + 4.6, x1 = x0 + 90.8, z1 = z0 + 90.8;
      const d = Math.hypot(Math.max(x0 - p.x, 0, p.x - x1), Math.max(z0 - p.z, 0, p.z - z1));
      assert.ok(d >= ring.width / 2 + 0.5, `point ${p.x},${p.z} trop près du quartier ${ix + dx},${iz + dz}`);
    }
  }
});

test('aucun quartier de la cité exclu ; les premiers rangs d\'attribution restent libres', () => {
  const blocked = blockedDistricts(createRoadNetwork());
  const d2 = i => ((i % 20) - 10) ** 2 + (Math.floor(i / 20) - 10) ** 2;
  const order = [...Array(400).keys()].filter(i => i !== 210 && i !== 190).sort((a, b) => d2(a) - d2(b) || a - b);
  for (const i of blocked) {
    const x = -1000 + (i % 20) * 100, z = -1000 + Math.floor(i / 20) * 100;
    assert.ok(!(x >= CITY.minX && x + 100 <= CITY.maxX && z >= CITY.minZ && z + 100 <= CITY.maxZ), 'quartier de cité bloqué : ' + i);
  }
  assert.ok(order.findIndex(i => blocked.has(i)) >= 20);
  assert.ok(blocked.size > 20);
});

test('profil en long : pont sur la rivière, pentes raisonnables, cité à plat', () => {
  const net = build();
  const west = net.roads.find(r => r.id === 'route-ouest');
  assert.equal(west.bridges.length, 1);
  assert.ok(west.bridges[0].level >= -0.9 + 1.8 - 1e-9);
  for (const r of net.roads) {
    for (let i = 1; i < r.heights.length; i++) assert.ok(Math.abs(r.heights[i] - r.heights[i - 1]) / 2 < 0.2, `${r.id} pente > 20 %`);
    if (r.id !== 'route-ouest') assert.equal(r.bridges.length, 0, r.id + ' ne doit pas franchir d\'eau');
  }
  assert.ok(net.roads[0].heights.every(h => Math.abs(h) < 0.05));
});

test('champ routier : terrassement sous la chaussée, tablier praticable au-dessus de l\'eau', () => {
  const net = build(), field = createRoadField(net), west = net.roads.find(r => r.id === 'route-ouest'), br = west.bridges[0];
  const mid = west.points[Math.round((br.wetFrom + br.wetTo) / 2)];
  const bed = natural(mid.x, mid.z);
  assert.ok(bed < -0.35);
  assert.equal(field.ground(mid.x, mid.z, bed), bed, 'le lit reste sous le pont');
  assert.ok(Math.abs(field.surface(mid.x, mid.z, bed) - br.level) < 0.1, 'on roule sur le tablier');
  const p = west.points[20], h = west.heights[20];
  assert.ok(Math.abs(field.ground(p.x, p.z, natural(p.x, p.z)) - h) < 0.05);
  assert.ok(field.distance(p.x, p.z) < 0);
  assert.equal(field.ground(0, 0, 0), 0);
});
