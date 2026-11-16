// Plan du quartier solarpunk (sans Three.js, testable sous Node).
// Juste au sud de la cité, accroché au boulevard (z = -300). Coordonnées monde en mètres.

export const SOLAR_BOX = { minX: -165, maxX: 385, minZ: -566, maxZ: -306 };
export const SLAB_TOP = 0.05;

// Bâtiments : centre, hauteur, emprises solides (boîtes) pour les collisions à pied et en voiture.
const box = (x, z, w, d, h) => ({ min: { x: x - w / 2, y: 0, z: z - d / 2 }, max: { x: x + w / 2, y: h, z: z + d / 2 } });
// La Canopée se visite : façades vitrées percées de 4 portes de 8 m (une par côté), toiture solide
// au-dessus de 6,4 m, et à l'intérieur les îlots en lamellé-collé, les jardinières et les poteaux.
export const CANOPEE = { L: 120, D: 64, door: 8, roofFrom: 6.4 };
export function canopeeSolids(x, z) {
  const { L, D, door, roofFrom } = CANOPEE, hw = L / 2, hd = D / 2, t = 0.4, H = 6.6, out = [];
  const wall = (x0, x1, z0, z1) => out.push({ min: { x: x0, y: 0, z: z0 }, max: { x: x1, y: H, z: z1 } });
  for (const s of [1, -1]) {
    wall(x - hw, x - door / 2, z + s * hd - t / 2, z + s * hd + t / 2); wall(x + door / 2, x + hw, z + s * hd - t / 2, z + s * hd + t / 2);
    wall(x + s * hw - t / 2, x + s * hw + t / 2, z - hd, z - door / 2); wall(x + s * hw - t / 2, x + s * hw + t / 2, z + door / 2, z + hd);
  }
  out.push({ min: { x: x - hw - 3, y: roofFrom, z: z - hd - 3 }, max: { x: x + hw + 3, y: 18.4, z: z + hd + 3 } });
  for (let k = 0; k < 8; k++) { const u = -48 + k * 13.5, v = (k % 2 ? 1 : -1) * 6; out.push({ min: { x: x + u - 3.7, y: 0, z: z + v - 2.7 }, max: { x: x + u + 3.7, y: 3.75, z: z + v + 2.7 } }); }
  const peaks = [[-38, 0], [0, 0], [38, 0]];
  for (const [px, pz] of peaks) out.push({ min: { x: x + px - 4, y: 0, z: z + pz - 4 }, max: { x: x + px + 4, y: 0.75, z: z + pz + 4 } });
  for (let i = -4; i <= 4; i++) for (let j = -2; j <= 2; j++) { const u = i * 12.5, v = j * 12; if (peaks.some(([px, pz]) => Math.hypot(u - px, v - pz) < 7)) continue; out.push({ min: { x: x + u - 0.2, y: 0, z: z + v - 0.2 }, max: { x: x + u + 0.2, y: roofFrom, z: z + v + 0.2 } }); }
  return out;
}

export const BUILDINGS = [
  { id: 'spirale', nom: 'La Spirale', x: -15, z: -400, h: 150, solids: [box(-15, -400, 31, 31, 150)] },
  { id: 'ruche', nom: 'La Ruche', x: 90, z: -400, h: 172, solids: [box(90, -400, 35, 35, 172)] },
  { id: 'fusee', nom: 'La Fusée', x: 160, z: -400, h: 100, solids: [box(160, -400, 34, 34, 100)] },
  { id: 'racines', nom: 'Les Racines', x: -100, z: -400, h: 125, solids: [-1, 0, 1].flatMap(i => [-0.5, 0.5].map(j => box(-100 + i * 13, -400 + j * 12, 3.6, 3.6, 15))) },
  { id: 'oasis', nom: "L'Oasis", x: -95, z: -520, h: 280, solids: [box(-95, -520, 33, 33, 280)] },
  { id: 'canopee', nom: 'La Canopée', x: 115, z: -522, h: 18, solids: canopeeSolids(115, -522) },
  { id: 'phare', nom: 'Le Phare', x: 300, z: -386, h: 400, solids: [box(300, -386, 62, 62, 400)] },
];

// Rues : 10 m de chaussée, 2,5 m de trottoir. ns = nord-sud.
// Plan « dalle serrée » : le rond-point a disparu, le Phare est remonté, La Flèche occupe le coin sud-est
// et un boulevard de tramway remplace l'avenue nord.
export const STREET = { width: 10, sidewalk: 2.5 };
export const STREETS = [
  { a: [-150, -343], b: [-150, -470], ns: true },
  { a: [40, -343], b: [40, -566], ns: true },
  { a: [210, -343], b: [210, -566], ns: true },
  { a: [-150, -470], b: [210, -470], ns: false, nom: 'Avenue de la Flèche' },
  { a: [210, -437], b: [385, -437], ns: false, nom: 'Rue du Phare' },
];
export const ROUNDABOUT = null;
export const CROSSINGS = [[-150, -470], [40, -470], [210, -470], [210, -437]];
export const PHARE_GARDEN = 6; // largeur (m) du jardin circulaire au pied du Phare

// Boulevard du tramway (est-ouest, bord nord de la dalle) : trottoir 4 | chaussée 6,5 | quai 3 | voies 7 | quai 3 | chaussée 6,5 | trottoir 4.
export const TRAM = { z: -326, x0: -165, x1: 385, stops: [-60, 125, 300], half: 17 };

// La Flèche (700 m) — d'après 350 Park Avenue (Foster + Partners), base ×3. Socle levé sur colonnes en V.
export const FLECHE = (() => {
  const x = 300, z = -505, base = 36, solids = [box(x, z, 84, 84, base - 3)];
  for (const [nx, nz] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) for (let k = 0; k < 5; k++) { const s = -48 + k * 24; solids.push(box(x + nx * 54 + (nz ? s : 0), z + nz * 54 + (nx ? s : 0), 2.6, 2.6, 14)); }
  return { id: 'fleche', nom: 'La Flèche', x, z, h: 700, base, solids };
})();

export const insideSolar = (x, z, margin = 0) => x > SOLAR_BOX.minX - margin && x < SOLAR_BOX.maxX + margin && z > SOLAR_BOX.minZ - margin && z < SOLAR_BOX.maxZ + margin;
// Quartiers de 100 m touchés par le quartier solarpunk : exclus des futurs lots.
export function solarDistricts({ half = 1000, cell = 100, border = 4.6 } = {}) {
  const n = Math.round(half * 2 / cell), out = new Set();
  for (let iz = 0; iz < n; iz++) for (let ix = 0; ix < n; ix++) {
    const x0 = -half + ix * cell + border, z0 = -half + iz * cell + border, x1 = x0 + cell - 2 * border, z1 = z0 + cell - 2 * border;
    if (x1 > SOLAR_BOX.minX && x0 < SOLAR_BOX.maxX && z1 > SOLAR_BOX.minZ && z0 < SOLAR_BOX.maxZ) out.add(iz * n + ix);
  }
  return out;
}
