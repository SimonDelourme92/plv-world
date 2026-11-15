// Plan du quartier solarpunk (sans Three.js, testable sous Node).
// Juste au sud de la cité, accroché au boulevard (z = -300). Coordonnées monde en mètres.

export const SOLAR_BOX = { minX: -165, maxX: 385, minZ: -566, maxZ: -306 };
export const SLAB_TOP = 0.05;

// Bâtiments : centre, hauteur, emprises solides (boîtes) pour les collisions à pied et en voiture.
const box = (x, z, w, d, h) => ({ min: { x: x - w / 2, y: 0, z: z - d / 2 }, max: { x: x + w / 2, y: h, z: z + d / 2 } });
export const BUILDINGS = [
  { id: 'spirale', nom: 'La Spirale', x: -15, z: -400, h: 150, solids: [box(-15, -400, 31, 31, 150)] },
  { id: 'ruche', nom: 'La Ruche', x: 90, z: -400, h: 172, solids: [box(90, -400, 35, 35, 172)] },
  { id: 'fusee', nom: 'La Fusée', x: 160, z: -400, h: 100, solids: [box(160, -400, 34, 34, 100)] },
  { id: 'racines', nom: 'Les Racines', x: -100, z: -400, h: 125, solids: [-1, 0, 1].flatMap(i => [-0.5, 0.5].map(j => box(-100 + i * 13, -400 + j * 12, 3.6, 3.6, 15))) },
  { id: 'oasis', nom: "L'Oasis", x: -95, z: -520, h: 280, solids: [box(-95, -520, 33, 33, 280)] },
  { id: 'canopee', nom: 'La Canopée', x: 115, z: -522, h: 18, solids: [box(115, -522, 121, 65, 18)] },
  { id: 'phare', nom: 'Le Phare', x: 300, z: -470, h: 400, solids: [box(300, -470, 62, 62, 400)] },
];

// Rues : 10 m de chaussée, 2,5 m de trottoir. ns = nord-sud.
export const STREET = { width: 10, sidewalk: 2.5 };
export const STREETS = [
  { a: [-150, -335], b: [300, -335], ns: false, nom: 'Avenue des Jardins' },
  { a: [-150, -470], b: [229, -470], ns: false, nom: 'Avenue du Phare' },
  { a: [-150, -304], b: [-150, -470], ns: true },
  { a: [40, -304], b: [40, -545], ns: true },
  { a: [210, -304], b: [210, -470], ns: true },
  { a: [300, -335], b: [300, -399], ns: true, spur: true },
];
export const ROUNDABOUT = { x: 300, z: -470, r: 66 };
export const CROSSINGS = [[-150, -335], [40, -335], [210, -335], [300, -335], [-150, -470], [40, -470], [210, -470]];

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
