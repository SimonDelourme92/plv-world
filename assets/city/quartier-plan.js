// Îlots d'habitation du quartier (sans Three.js, testable sous Node).
// Immeubles mitoyens générés de façon déterministe autour des tours : la même graine donne toujours
// le même quartier, donc les mêmes emprises de collision que le décor 3D.
import { BUILDINGS, FLECHE } from './layout.js';

// Gabarits : rez-de-chaussée commercial 4,2 m, étages 3,1 m, travées 3,2 m, profondeur 12,8 m.
export const GF = 4.2, FL = 3.1, BAY = 3.2, DEPTH = 12.8;
// Styles de façade (même ordre que le module 3D) et nombre d'étages possible pour chacun.
export const STYLES = [
  { id: 'pierre', floors: [5, 6], mansard: true }, { id: 'brique', floors: [4, 7] }, { id: 'brique_claire', floors: [5, 8] },
  { id: 'blanc', floors: [6, 9] }, { id: 'terracotta', floors: [4, 6] }, { id: 'bois', floors: [5, 8] },
  { id: 'gris', floors: [6, 8] }, { id: 'ocre', floors: [4, 6] }, { id: 'sauge', floors: [5, 7] },
];

// Zones réservées autour des tours (jardins, parvis).
const at = id => BUILDINGS.find(b => b.id === id);
const KEEP_TOWERS = { racines: { rect: [-126, -74, -424, -376] }, spirale: { x: at('spirale').x, z: at('spirale').z, r: 23 }, ruche: { x: at('ruche').x, z: at('ruche').z, r: 25 }, fusee: { x: at('fusee').x, z: at('fusee').z, r: 25 }, phare: { x: at('phare').x, z: at('phare').z, r: 45 }, oasis: { rect: [-119, -71, -544, -496] }, canopee: { rect: [52, 178, -557, -487] } };

// Place des Fontaines : mail planté, fontaine, marché, terrasses, bouche de passage souterrain.
export const SQUARE = { rect: [-50, 25, -560, -484], fountain: [-12, -522, 7], market: [-12, -494, 6], groveStep: 11, metro: [-12, -552] };

// Îlots : rectangles délimités par les rues (bords de trottoir) ; « rows » = rangées intérieures desservies par des ruelles.
export const BLOCKS = [
  { rect: [-142.5, 32.5, -462.5, -343], rows: 7, keep: [KEEP_TOWERS.racines, KEEP_TOWERS.spirale] },
  { rect: [47.5, 202.5, -462.5, -343], rows: 7, keep: [KEEP_TOWERS.ruche, KEEP_TOWERS.fusee] },
  { rect: [217.5, 385, -429.5, -343], rows: 7, keep: [KEEP_TOWERS.phare] },
  { rect: [-142.5, 32.5, -566, -477.5], keep: [KEEP_TOWERS.oasis, { rect: [-52, 33, -560, -484] }], sides: ['+z', '-x', '+x'] },
  { rect: [47.5, 202.5, -566, -477.5], keep: [KEEP_TOWERS.canopee], sides: ['+x'] },
];

const rectHit = (a, b) => a[0] < b[1] && a[1] > b[0] && a[2] < b[3] && a[3] > b[2];
export const keepHit = (fp, keep) => keep.some(k => k.r ? Math.hypot(Math.max(fp[0], Math.min(fp[1], k.x)) - k.x, Math.max(fp[2], Math.min(fp[3], k.z)) - k.z) < k.r : rectHit(fp, k.rect));

export function buildPlan(seed = 777) {
  let s = seed; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647, pick = a => a[Math.floor(rnd() * a.length)];
  const houses = [], lanes = [], courts = [];
  for (const blk of BLOCKS) {
    const [x0, x1, z0, z1] = blk.rect, D = DEPTH, keep = blk.keep || [], sides = blk.sides || ['+z', '-z', '+x', '-x'];
    const segs = (a, b) => { const out = []; let t = a; while (b - t > 6.3) { let len = pick([3, 4, 4, 5, 5, 6, 7]) * BAY; if (b - t - len < 6.4) len = b - t; out.push([t, t + len]); t += len; } if (out.length && b - t > 0.1) out[out.length - 1][1] = b; return out; };
    const add = (fp, face) => { if (keepHit(fp, keep)) return; const style = Math.floor(rnd() * STYLES.length), [f0, f1] = STYLES[style].floors; const floors = f0 + Math.floor(rnd() * (f1 - f0 + 1)); houses.push({ fp, face, style, floors, shop: true, top: GF + floors * FL + (STYLES[style].mansard ? 3.8 : 0.9) }); };
    if (sides.includes('+z')) for (const [a, b] of segs(x0, x1)) add([a, b, z1 - D, z1], '+z');
    if (sides.includes('-z')) for (const [a, b] of segs(x0, x1)) add([a, b, z0, z0 + D], '-z');
    const za = sides.includes('-z') ? z0 + D : z0, zb = sides.includes('+z') ? z1 - D : z1;
    if (sides.includes('+x')) for (const [a, b] of segs(za, zb)) add([x1 - D, x1, a, b], '+x');
    if (sides.includes('-x')) for (const [a, b] of segs(za, zb)) add([x0, x0 + D, a, b], '-x');
    if (blk.rows) {
      const lane = blk.rows, ix0 = (sides.includes('-x') ? x0 + D : x0) + lane, ix1 = (sides.includes('+x') ? x1 - D : x1) - lane;
      for (let zt = zb - lane; zt - D > za + lane - 0.1; zt -= D + lane) { for (const [a, b] of segs(ix0, ix1)) add([a, b, zt - D, zt], '+z'); lanes.push([ix0, ix1, zt, zt + lane]); }
    } else courts.push([x0 + D + 1, x1 - D - 1, z0 + D + 1, z1 - D - 1, keep]);
  }
  const solids = houses.map(h => ({ min: { x: h.fp[0], y: 0, z: h.fp[2] }, max: { x: h.fp[1], y: h.top, z: h.fp[3] } }));
  return { houses, lanes, courts, solids, keepHit, pick };
}

// Emprises de collision du quartier vivant (immeubles, Flèche, fontaine).
export function quartierSolids(plan = buildPlan()) {
  const [fx, fz, fr] = SQUARE.fountain;
  return [...plan.solids, ...FLECHE.solids, { min: { x: fx - fr - 0.4, y: 0, z: fz - fr - 0.4 }, max: { x: fx + fr + 0.4, y: 0.8, z: fz + fr + 0.4 } }];
}
