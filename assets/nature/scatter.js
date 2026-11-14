// Répartition déterministe de la végétation (sans Three.js, testable sous Node).
// Forêts denses (résineux, feuillus ou mixtes selon la zone), clairières, lisières de buissons,
// bosquets dans les prairies, grands arbres isolés, berges plantées, rochers épars,
// alignement d'arbres le long du boulevard. Rien dans la cité, sur les routes ou dans l'eau.

export const SPECIES = [
  { id: 'arbre-feuillu', kind: 'tree', radius: 0.35, scale: [0.8, 1.2] },
  { id: 'feuillu-rond', kind: 'tree', radius: 0.38, scale: [0.85, 1.25] },
  { id: 'feuillu-eleve', kind: 'tree', radius: 0.3, scale: [0.85, 1.2] },
  { id: 'pin', kind: 'tree', radius: 0.3, scale: [0.95, 1.45] },
  { id: 'pin-touffu', kind: 'tree', radius: 0.32, scale: [0.85, 1.3] },
  { id: 'arbre-tordu', kind: 'tree', radius: 0.5, scale: [0.42, 0.62] },
  { id: 'arbre-tordu-large', kind: 'tree', radius: 0.5, scale: [0.42, 0.62] },
  { id: 'arbre-mort', kind: 'tree', radius: 0.28, scale: [0.6, 0.9] },
  { id: 'buisson', kind: 'bush', radius: 0, scale: [0.7, 1.35] },
  { id: 'buisson-fleuri', kind: 'bush', radius: 0, scale: [0.7, 1.2] },
  { id: 'fougere', kind: 'plant', radius: 0, scale: [0.6, 1.15] },
  { id: 'rocher-moyen', kind: 'rock', radius: 1.0, scale: [0.45, 1.25] },
  { id: 'rocher-plat', kind: 'rock', radius: 1.1, scale: [0.45, 1.15] },
];
const S = Object.fromEntries(SPECIES.map((s, i) => [s.id, i]));
export const DENSITY = { off: 0, low: 13, medium: 9.5, high: 7.5 }; // pas de la grille (m)

const hash = (a, b, c = 0) => {
  let n = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(c | 0, 2246822519);
  n = Math.imul(n ^ (n >>> 13), 1274126177); n ^= n >>> 16;
  return (n >>> 0) / 4294967296;
};
const lerp = (a, b, t) => a + (b - a) * t;
const vnoise = (x, z, seed) => {
  const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz, sx = fx * fx * (3 - 2 * fx), sz = fz * fz * (3 - 2 * fz);
  return lerp(lerp(hash(ix, iz, seed), hash(ix + 1, iz, seed), sx), lerp(hash(ix, iz + 1, seed), hash(ix + 1, iz + 1, seed), sx), sz);
};
const fbm = (x, z, seed) => (vnoise(x, z, seed) * 0.55 + vnoise(x * 2.1, z * 2.1, seed + 1) * 0.3 + vnoise(x * 4.3, z * 4.3, seed + 2) * 0.15);
const pick = (r, table) => { let acc = 0; for (const [id, w] of table) { acc += w; if (r < acc) return S[id]; } return S[table.at(-1)[0]]; };

const CONIFERS = [['pin', 0.5], ['pin-touffu', 0.42], ['arbre-feuillu', 0.08]];
const BROADLEAF = [['arbre-feuillu', 0.34], ['feuillu-rond', 0.34], ['feuillu-eleve', 0.22], ['arbre-tordu', 0.05], ['arbre-tordu-large', 0.05]];
const MIXED = [['pin', 0.22], ['pin-touffu', 0.18], ['arbre-feuillu', 0.22], ['feuillu-rond', 0.2], ['feuillu-eleve', 0.18]];
const LONE = [['arbre-tordu', 0.3], ['arbre-tordu-large', 0.3], ['feuillu-rond', 0.25], ['arbre-feuillu', 0.15]];

/**
 * @param {object} o
 * @param {string} o.density off|low|medium|high
 * @param {{minX,maxX,minZ,maxZ}} o.city zone sans végétation (lots)
 * @param {(x,z)=>boolean} o.isWater lit mouillé
 * @param {(x,z)=>number} o.bankDepth profondeur du lit (0 hors rivière, >0 dans le lit)
 * @param {(x,z)=>number} o.roadDistance distance au bord de chaussée (m)
 * @param {Array<{min,max}>} o.obstacles boîtes à éviter (repères fixes)
 * @param {Array<{x,z}>} o.boulevard points du boulevard (alignement d'arbres)
 */
export function scatterNature({ density = 'medium', half = 1000, city, isWater = () => false, bankDepth = () => 0, roadDistance = () => Infinity, obstacles = [], boulevard = [] } = {}) {
  const step = DENSITY[density] ?? DENSITY.medium, out = { x: [], z: [], species: [], scale: [], rotation: [] };
  if (!step) return pack(out);
  const margin = { tree: 3.6, bush: 1.6, plant: 1.1, rock: 2.6 };
  const inCity = (x, z, m) => city && x > city.minX - m && x < city.maxX + m && z > city.minZ - m && z < city.maxZ + m;
  const blocked = (x, z, kind) => {
    if (Math.abs(x) > half - 12 || Math.abs(z) > half - 12) return true;
    if (inCity(x, z, kind === 'tree' ? 14 : 8)) return true;
    if (isWater(x, z)) return true;
    if (roadDistance(x, z) < margin[kind]) return true;
    for (const b of obstacles) if (x > b.min.x - 6 && x < b.max.x + 6 && z > b.min.z - 6 && z < b.max.z + 6) return true;
    return false;
  };
  const add = (x, z, sp, salt) => {
    const def = SPECIES[sp];
    if (blocked(x, z, def.kind)) return;
    out.x.push(+x.toFixed(2)); out.z.push(+z.toFixed(2)); out.species.push(sp);
    out.scale.push(+lerp(def.scale[0], def.scale[1], hash(x * 10, z * 10, salt)).toFixed(3));
    out.rotation.push(+(hash(z * 10, x * 10, salt + 9) * Math.PI * 2).toFixed(3));
  };
  const n = Math.ceil((half * 2) / step), perCell = density === 'low' ? 1 : 2;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const r = k => hash(i, j, k);
    const x = -half + (i + 0.15 + r(1) * 0.7) * step, z = -half + (j + 0.15 + r(2) * 0.7) * step;
    if (inCity(x, z, 12)) continue;
    const forest = fbm(x / 340 + 3.1, z / 340 - 7.4, 11);
    const clearing = vnoise(x / 85, z / 85, 23);
    const stand = vnoise(x / 520 - 2, z / 520 + 5, 31);
    const grove = vnoise(x / 55, z / 55, 41);
    const bank = bankDepth(x, z);
    if (bank > 0 && bank < 0.35) { // berges : feuillus, buissons, fougères
      const t = r(3);
      if (t < 0.22) add(x, z, pick(r(4), [['arbre-feuillu', 0.5], ['feuillu-rond', 0.5]]), 1);
      else if (t < 0.55) add(x, z, r(4) < 0.6 ? S['buisson'] : S['fougere'], 2);
      continue;
    }
    if (forest > 0.56 && clearing > 0.24) { // forêt
      const table = stand < 0.4 ? CONIFERS : stand > 0.6 ? BROADLEAF : MIXED;
      // Sous-bois serré : plusieurs arbres par case (canopée continue vue du ciel).
      for (let k = 0; k < perCell; k++) {
        const ox = k ? (r(20 + k) - 0.5) * step * 0.95 : 0, oz = k ? (r(30 + k) - 0.5) * step * 0.95 : 0;
        if (r(3 + k * 7) < 0.86) add(x + ox, z + oz, r(5 + k * 7) < 0.025 ? S['arbre-mort'] : pick(r(4 + k * 7), table), 3 + k * 50);
      }
      if (r(6) < (stand < 0.4 ? 0.12 : 0.32)) add(x + (r(7) - 0.5) * step * 0.6, z + (r(8) - 0.5) * step * 0.6, r(9) < 0.7 ? S['fougere'] : S['buisson'], 4);
    } else if (forest > 0.49 || (forest > 0.56 && clearing <= 0.24)) { // lisière ou bord de clairière
      const t = r(3);
      if (t < 0.28) add(x, z, pick(r(4), forest > 0.53 ? MIXED : BROADLEAF), 5);
      else if (t < 0.62) add(x, z, r(4) < 0.35 ? S['buisson-fleuri'] : S['buisson'], 6);
      else if (t < 0.75) add(x, z, S['fougere'], 7);
    } else if (grove > 0.8) { // bosquet en prairie
      if (r(3) < 0.75) add(x, z, pick(r(4), r(10) < 0.5 ? BROADLEAF : MIXED), 8);
      else if (r(3) < 0.95) add(x, z, S['buisson'], 9);
    } else { // prairie : rares arbres isolés et buissons
      const t = r(3) * 100;
      if (t < 0.7) add(x, z, pick(r(4), LONE), 10);
      else if (t < 1.6) add(x, z, r(4) < 0.5 ? S['buisson-fleuri'] : S['buisson'], 11);
    }
    // Rochers épars, plus nombreux en forêt.
    if (r(12) < (forest > 0.5 ? 0.012 : 0.005)) add(x + step * 0.3, z - step * 0.3, r(13) < 0.5 ? S['rocher-moyen'] : S['rocher-plat'], 12);
  }
  // Alignement le long du boulevard, côté campagne, tous les 16 m environ.
  for (let k = 0, acc = 8; k < boulevard.length; k++) {
    const a = boulevard[k], b = boulevard[(k + 1) % boulevard.length], l = Math.hypot(b.x - a.x, b.z - a.z);
    acc += l; if (acc < 16) continue; acc = 0;
    const nx = -(b.z - a.z) / (l || 1), nz = (b.x - a.x) / (l || 1), x = a.x - nx * 10, z = a.z - nz * 10; // côté campagne
    if (!inCity(x, z, 3) && !isWater(x, z) && roadDistance(x, z) > 4) {
      out.x.push(+x.toFixed(2)); out.z.push(+z.toFixed(2)); out.species.push(S['feuillu-eleve']);
      out.scale.push(+(0.92 + hash(k, 5) * 0.12).toFixed(3)); out.rotation.push(+(hash(k, 6) * 6.28).toFixed(3));
    }
  }
  return pack(out);
}
function pack(o) {
  return { count: o.x.length, x: Float32Array.from(o.x), z: Float32Array.from(o.z), species: Uint8Array.from(o.species), scale: Float32Array.from(o.scale), rotation: Float32Array.from(o.rotation) };
}
