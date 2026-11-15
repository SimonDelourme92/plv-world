// Réseau routier déterministe, sans Three.js (testable sous Node).
//
// Principe : la « cité » (6 × 5 quartiers autour des lots) reste réservée aux lots de PLV.
// Le boulevard en anneau suit les allées entre quartiers (9,2 m de large), il ne touche donc
// jamais l'intérieur d'un quartier, ni aujourd'hui ni pour les lots futurs. La campagne autour
// reçoit une boucle sinueuse reliée à l'anneau par quatre liaisons ; celle de l'ouest franchit
// la rivière par un pont. Les quartiers traversés par une route de campagne sont signalés
// (blockedDistricts) pour que les futurs lots ne s'y installent jamais.

export const CITY = { minX: -200, maxX: 400, minZ: -300, maxZ: 200 };
export const STEP = 2; // m entre deux points de chaussée
const RING_RADIUS = 6; // angle de carrefour : reste dans le croisement des allées

const ringPoints = () => {
  const { minX, maxX, minZ, maxZ } = CITY, r = RING_RADIUS, pts = [];
  const line = (ax, az, bx, bz) => {
    const n = Math.max(1, Math.round(Math.hypot(bx - ax, bz - az) / STEP));
    for (let i = 0; i < n; i++) pts.push({ x: ax + (bx - ax) * i / n, z: az + (bz - az) * i / n });
  };
  const arc = (cx, cz, a0) => {
    const n = Math.round((Math.PI / 2 * r) / STEP);
    for (let i = 0; i < n; i++) { const a = a0 + (Math.PI / 2) * i / n; pts.push({ x: cx + Math.cos(a) * r, z: cz + Math.sin(a) * r }); }
  };
  // Sens horaire vu du dessus (x vers la droite, z vers le bas).
  line(minX + r, minZ, maxX - r, minZ); arc(maxX - r, minZ + r, -Math.PI / 2);
  line(maxX, minZ + r, maxX, maxZ - r); arc(maxX - r, maxZ - r, 0);
  line(maxX - r, maxZ, minX + r, maxZ); arc(minX + r, maxZ - r, Math.PI / 2);
  line(minX, maxZ - r, minX, minZ + r); arc(minX + r, minZ + r, Math.PI);
  return pts;
};

// Catmull-Rom échantillonnée à pas quasi constant.
function spline(ctrl, closed) {
  const n = ctrl.length, out = [], at = i => closed ? ctrl[(i + n) % n] : ctrl[Math.max(0, Math.min(n - 1, i))];
  const spans = closed ? n : n - 1;
  for (let i = 0; i < spans; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    const steps = Math.max(2, Math.ceil(Math.hypot(p2.x - p1.x, p2.z - p1.z) / STEP));
    for (let s = 0; s < steps; s++) {
      const t = s / steps, t2 = t * t, t3 = t2 * t;
      const f = k => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3);
      out.push({ x: f('x'), z: f('z') });
    }
  }
  if (!closed) out.push({ ...ctrl[n - 1] });
  return out;
}

const LOOP = [
  { x: 50, z: -650 }, { x: 330, z: -615 }, { x: 590, z: -470 }, { x: 735, z: -220 }, { x: 765, z: 60 },
  { x: 720, z: 330 }, { x: 600, z: 560 }, { x: 360, z: 720 }, { x: 80, z: 765 }, { x: -200, z: 720 },
  { x: -460, z: 625 }, { x: -640, z: 420 }, { x: -720, z: 160 }, { x: -705, z: -110 }, { x: -650, z: -390 },
  { x: -440, z: -625 }, { x: -170, z: -665 },
];
// Liaisons : premier point sur l'anneau, dernier point accroché à la boucle.
const LINKS = [
  { id: 'route-nord', ctrl: [{ x: 300, z: 200 }, { x: 296, z: 270 }, { x: 250, z: 380 }, { x: 290, z: 520 }, { x: 330, z: 650 }] },
  { id: 'route-est', ctrl: [{ x: 400, z: 0 }, { x: 470, z: -4 }, { x: 585, z: 40 }, { x: 700, z: 30 }] },
  // Longe le quartier solarpunk par l'ouest (le quartier occupe x -165 → 385 au sud de la cité).
  { id: 'route-sud', ctrl: [{ x: -180, z: -300 }, { x: -186, z: -372 }, { x: -205, z: -470 }, { x: -190, z: -575 }, { x: -175, z: -640 }] },
  { id: 'route-ouest', ctrl: [{ x: -200, z: 60 }, { x: -255, z: 74 }, { x: -318, z: 90 }, { x: -372, z: 84 }, { x: -425, z: 70 }, { x: -490, z: 38 }, { x: -575, z: 6 }, { x: -650, z: -30 }] },
];

const nearestIndex = (pts, p) => {
  let best = 0, bd = Infinity;
  for (let i = 0; i < pts.length; i++) { const d = (pts[i].x - p.x) ** 2 + (pts[i].z - p.z) ** 2; if (d < bd) { bd = d; best = i; } }
  return best;
};

export function segmentDistance(p, a, b) {
  const dx = b.x - a.x, dz = b.z - a.z, l2 = dx * dx + dz * dz;
  const t = l2 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / l2)) : 0;
  return Math.hypot(p.x - (a.x + t * dx), p.z - (a.z + t * dz));
}

export function createRoadNetwork() {
  const ring = ringPoints(), loop = spline(LOOP, true);
  const roads = [
    { id: 'boulevard', kind: 'boulevard', width: 7, closed: true, points: ring },
    { id: 'boucle', kind: 'campagne', width: 6, closed: true, points: loop },
  ];
  for (const link of LINKS) {
    const ctrl = link.ctrl.map(p => ({ ...p }));
    ctrl[0] = { ...ring[nearestIndex(ring, ctrl[0])] };
    const end = loop[nearestIndex(loop, ctrl.at(-1))];
    ctrl.push({ ...end });
    roads.push({ id: link.id, kind: 'liaison', width: 6, closed: false, points: spline(ctrl, false), joins: ['boulevard', 'boucle'] });
  }
  for (const r of roads) r.points = r.points.map(p => ({ x: +p.x.toFixed(3), z: +p.z.toFixed(3) }));
  return { roads, segmentDistance };
}

// Quartiers dont l'intérieur est touché par une route (avec une marge) : exclus des futurs lots.
// Le boulevard tient dans l'allée (chaussée + accotement < 4,6 m de part et d'autre de l'axe).
export function blockedDistricts(network, { half = 1000, cell = 100, border = 4.6, margin = 6 } = {}) {
  const count = Math.round(half * 2 / cell), blocked = new Set();
  const inAlley = p => p.x > CITY.minX - border && p.x < CITY.maxX + border && p.z > CITY.minZ - border && p.z < CITY.maxZ + border;
  for (const road of network.roads) for (const p of road.points) {
    if (road.kind !== 'boulevard' && inAlley(p)) continue; // raccord sur l'anneau, dans l'allée
    const ix = Math.floor((p.x + half) / cell), iz = Math.floor((p.z + half) / cell), reach = road.width / 2 + (road.kind === 'boulevard' ? 0.5 : margin);
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      const cx = ix + dx, cz = iz + dz;
      if (cx < 0 || cz < 0 || cx >= count || cz >= count) continue;
      const x0 = -half + cx * cell + border, z0 = -half + cz * cell + border, x1 = x0 + cell - 2 * border, z1 = z0 + cell - 2 * border;
      if (Math.hypot(Math.max(x0 - p.x, 0, p.x - x1), Math.max(z0 - p.z, 0, p.z - z1)) < reach) blocked.add(cz * count + cx);
    }
  }
  return blocked;
}

// Profil en long : altitude lissée de la chaussée, ponts au-dessus de l'eau.
// natural(x,z) = sol naturel ; isWater(x,z) = vrai au-dessus du lit mouillé.
export function profileNetwork(network, { natural, isWater, deckClearance = 1.8, waterLevel = -0.9 }) {
  for (const road of network.roads) {
    const pts = road.points, n = pts.length, closed = road.closed;
    const raw = pts.map(p => natural(p.x, p.z)), wet = pts.map(p => isWater(p.x, p.z));
    const idx = i => closed ? (i + n) % n : Math.max(0, Math.min(n - 1, i));
    const smoothed = (src, radius, keep) => src.map((v, i) => {
      if (keep?.[i]) return v;
      let s = 0, c = 0;
      for (let k = -radius; k <= radius; k++) { const j = idx(i + k), w = radius + 1 - Math.abs(k); s += src[j] * w; c += w; }
      return s / c;
    });
    // Travées : suites de points mouillés, prolongées de 4 points (8 m) de chaque côté pour les culées.
    const deck = new Array(n).fill(false), bridgeId = new Array(n).fill(-1), bridges = [];
    for (let i = 0; i < n; i++) {
      if (!wet[i] || deck[i]) continue;
      let j = i; while (j + 1 < n && wet[j + 1]) j++;
      const a = Math.max(0, i - 4), b = Math.min(n - 1, j + 4);
      bridges.push({ from: a, to: b, wetFrom: i, wetTo: j });
      for (let k = a; k <= b; k++) { deck[k] = true; bridgeId[k] = bridges.length - 1; }
      i = j;
    }
    let y = smoothed(raw, 18);
    for (const br of bridges) {
      const level = Math.max(waterLevel + deckClearance, y[br.from], y[br.to]);
      br.level = level;
      for (let k = br.from; k <= br.to; k++) y[k] = level;
    }
    y = smoothed(y, 7, deck);
    road.bridges = bridges;
    road.heights = y.map(v => +v.toFixed(3));
    road.deck = deck;
    road.wet = wet;
  }
  return network;
}

// Champ d'influence au sol : altitude de chaussée la plus proche, pour aplanir le terrain
// le long des routes et donner l'altitude du tablier sur les ponts.
export function createRoadField(network, { blend = 12, shoulder = 1.6, cell = 16 } = {}) {
  const grid = new Map(), segs = [];
  for (const road of network.roads) {
    const pts = road.points, n = pts.length, last = road.closed ? n : n - 1;
    for (let i = 0; i < last; i++) {
      const j = (i + 1) % n, a = pts[i], b = pts[j];
      const seg = { a, b, ya: road.heights?.[i] ?? 0, yb: road.heights?.[j] ?? 0, half: road.width / 2, wet: !!(road.wet?.[i] && road.wet?.[j]), deck: !!(road.deck?.[i] || road.deck?.[j]), road };
      const id = segs.push(seg) - 1, reach = seg.half + shoulder + blend;
      const x0 = Math.floor((Math.min(a.x, b.x) - reach) / cell), x1 = Math.floor((Math.max(a.x, b.x) + reach) / cell);
      const z0 = Math.floor((Math.min(a.z, b.z) - reach) / cell), z1 = Math.floor((Math.max(a.z, b.z) + reach) / cell);
      for (let gz = z0; gz <= z1; gz++) for (let gx = x0; gx <= x1; gx++) {
        const key = gx * 100003 + gz;
        let list = grid.get(key); if (!list) grid.set(key, list = []);
        list.push(id);
      }
    }
  }
  const nearest = (x, z) => {
    const list = grid.get(Math.floor(x / cell) * 100003 + Math.floor(z / cell));
    if (!list) return null;
    let best = null, bd = Infinity, bt = 0;
    for (const id of list) {
      const s = segs[id], dx = s.b.x - s.a.x, dz = s.b.z - s.a.z, l2 = dx * dx + dz * dz;
      const t = l2 ? Math.max(0, Math.min(1, ((x - s.a.x) * dx + (z - s.a.z) * dz) / l2)) : 0;
      const d = Math.hypot(x - s.a.x - t * dx, z - s.a.z - t * dz) - s.half;
      if (d < bd) { bd = d; best = s; bt = t; }
    }
    return best && { seg: best, d: bd, y: best.ya + (best.yb - best.ya) * bt };
  };
  const smooth = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
  return {
    nearest,
    // Altitude du sol modelé (terrassement) ; sous un tablier de pont, le lit naturel reste.
    ground(x, z, natural) {
      const r = nearest(x, z);
      if (!r || r.d > shoulder + blend) return natural;
      if (r.seg.wet) return natural;
      const w = 1 - smooth(shoulder, shoulder + blend, r.d);
      return natural + (r.y - 0.03 - natural) * w;
    },
    // Altitude de marche/roulage : tablier si l'on est sur un pont.
    surface(x, z, ground) {
      const r = nearest(x, z);
      if (!r || !r.seg.deck || r.d > 0.35) return ground;
      return Math.max(ground, r.y + 0.04);
    },
    // Distance au bord de chaussée la plus proche (négative sur la chaussée).
    distance(x, z) { const r = nearest(x, z); return r ? r.d : Infinity; },
    segments: segs,
  };
}
