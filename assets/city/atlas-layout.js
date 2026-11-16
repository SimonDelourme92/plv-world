// ATLAS — « Les montagnes suspendues » (étude de Simon, inspiration KING Toronto / BIG).
// Plan sans Three.js, testable sous Node : implantation à l'est du quartier solarpunk, emprises de collision.
// Le modèle est construit en repère local (x = 306 m, z = 198 m) puis tourné d'un quart de tour :
// local x → monde −z, local z → monde +x.
export const ATLAS = { x: 536, z: -195, rot: Math.PI / 2, top: 0.05 };
// Parvis local (x ±168, z ±122) → monde.
export const ATLAS_PLAZA = { minX: ATLAS.x - 122, maxX: ATLAS.x + 122, minZ: ATLAS.z - 168, maxZ: ATLAS.z + 168 };

// Grille des modules (même calcul que l'étude d'origine).
export const NX = 34, NZ = 22, CELL = 9, FLOOR = 4.2, BASE = 19;
export const PEAKS = [[-10, -5, 36], [7, -5, 29], [10, 5, 24], [-7, 5, 28]];
export function atlasHeights() {
  const h = new Map();
  for (let i = 0; i < NX; i++) for (let j = 0; j < NZ; j++) {
    const u = i - (NX - 1) / 2, v = j - (NZ - 1) / 2;
    if (Math.abs(u) < 8 && Math.abs(v) < 4) continue; // grande cour ouverte jusqu'au sol
    let k = 4; for (const [px, pz, ph] of PEAKS) k = Math.max(k, ph - 2.25 * Math.abs(u - px) - 2.4 * Math.abs(v - pz));
    h.set(i + ',' + j, Math.max(4, Math.round(k)));
  }
  return h;
}

// Repère local → monde.
export const toWorld = (lx, lz) => [ATLAS.x + lz, ATLAS.z - lx];
const worldBox = (lx0, lx1, lz0, lz1, y0, y1) => { const [ax, az] = toWorld(lx0, lz0), [bx, bz] = toWorld(lx1, lz1); return { min: { x: Math.min(ax, bx), y: y0, z: Math.min(az, bz) }, max: { x: Math.max(ax, bx), y: y1, z: Math.max(az, bz) } }; };

export function atlasSolids() {
  const out = [], h = atlasHeights();
  // Masse habitée au-dessus des pilotis (≈ 17 m libres dessous) : rangées de modules fusionnées.
  for (let j = 0; j < NZ; j++) {
    let i = 0;
    while (i < NX) {
      const k = h.get(i + ',' + j); if (!k) { i++; continue; }
      let e = i; while (e + 1 < NX && h.get((e + 1) + ',' + j) === k) e++;
      const x0 = (i - (NX - 1) / 2) * CELL - CELL / 2, x1 = (e - (NX - 1) / 2) * CELL + CELL / 2, z = (j - (NZ - 1) / 2) * CELL;
      out.push(worldBox(x0, x1, z - CELL / 2, z + CELL / 2, 16.7, BASE + k * FLOOR + 1.5)); i = e + 1;
    }
  }
  // Pieds des piliers ramifiés, colonnes d'about, noyaux de circulation.
  for (const x of [-126, -81, -36, 36, 81, 126]) for (const z of [-76.5, 76.5]) out.push(worldBox(x - 2.7, x + 2.7, z - 2.7, z + 2.7, 0, 9));
  for (const x of [-139.5, 139.5]) for (const z of [-40.5, 40.5]) out.push(worldBox(x - 1.2, x + 1.2, z - 1.2, z + 1.2, 0, 8));
  for (const x of [-108, 108]) for (const z of [-58.5, 58.5]) out.push(worldBox(x - 3.5, x + 3.5, z - 5, z + 5, 0, 18));
  // Escaliers vers le socle (marches de 25 cm : on les monte en sautant).
  for (const [sx, sz, sign] of [[-115, -91, -1], [115, 91, 1]]) for (let n = 0; n < 38; n++) { const z = sz + sign * (38 - n) * 0.8; out.push(worldBox(sx - 6.5, sx + 6.5, z - 0.41, z + 0.41, 0, (n + 1) * 0.5)); }
  return out;
}

// Rangement provisoire des PLV sous ATLAS : rectangles libres sous la masse (hors cour ouverte),
// entre les piliers, les noyaux et les escaliers. x, z = coin minimal ; w le long de x, d le long de z.
export const ATLAS_SLOTS = [
  { id: 'sud', x: 500, z: -112, w: 84, d: 44 },
  { id: 'nord', x: 500, z: -322, w: 84, d: 44 },
  { id: 'ouest', x: 440, z: -226, w: 56, d: 62 },
  { id: 'est', x: 576, z: -226, w: 56, d: 62 },
];

export const insideAtlas = (x, z, m = 0) => x > ATLAS_PLAZA.minX - m && x < ATLAS_PLAZA.maxX + m && z > ATLAS_PLAZA.minZ - m && z < ATLAS_PLAZA.maxZ + m;
// Quartiers de 100 m touchés par le parvis : exclus des futurs lots.
export function atlasDistricts({ half = 1000, cell = 100, border = 4.6 } = {}) {
  const n = Math.round(half * 2 / cell), out = new Set(), B = ATLAS_PLAZA;
  for (let iz = 0; iz < n; iz++) for (let ix = 0; ix < n; ix++) {
    const x0 = -half + ix * cell + border, z0 = -half + iz * cell + border, x1 = x0 + cell - 2 * border, z1 = z0 + cell - 2 * border;
    if (x1 > B.minX && x0 < B.maxX && z1 > B.minZ && z0 < B.maxZ) out.add(iz * n + ix);
  }
  return out;
}
