// Relief déterministe du domaine. Le module reste indépendant de Three.js afin
// que les pentes et les réservations puissent être testées sous Node.
const WORLD_HALF = 1000;
const smooth = (a, b, value) => {
  const t = Math.max(0, Math.min(1, (value - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const hash = (x, z) => {
  let n = Math.imul(Math.floor(x) + 374761393, 668265263);
  n = Math.imul(n ^ Math.floor(z) * 1274126177, 1274126177);
  n ^= n >>> 13;
  return ((n >>> 0) / 4294967295) * 2 - 1;
};
const valueNoise = (x, z) => {
  const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz;
  const sx = fx * fx * (3 - 2 * fx), sz = fz * fz * (3 - 2 * fz);
  const a = hash(ix, iz), b = hash(ix + 1, iz), c = hash(ix, iz + 1), d = hash(ix + 1, iz + 1);
  return (a + (b - a) * sx) * (1 - sz) + (c + (d - c) * sx) * sz;
};
const fbm = (x, z) => {
  let value = 0, amplitude = 0.5, frequency = 1;
  for (let octave = 0; octave < 5; octave++) {
    value += valueNoise(x * frequency, z * frequency) * amplitude;
    frequency *= 2.03;
    amplitude *= 0.5;
  }
  return value;
};
const distanceToBox = (x, z, box) => Math.hypot(
  Math.max(box.min.x - x, 0, x - box.max.x),
  Math.max(box.min.z - z, 0, z - box.max.z),
);

// La cité (quartiers des lots) reste plane ; le relief monte progressivement au-delà.
export const RELIEF_CITY = { minX: -200, maxX: 400, minZ: -300, maxZ: 200 };
const cityDistance = (x, z) => distanceToBox(x, z, { min: { x: RELIEF_CITY.minX, z: RELIEF_CITY.minZ }, max: { x: RELIEF_CITY.maxX, z: RELIEF_CITY.maxZ } });

export function createRelief({ reservations = () => [] } = {}) {
  return (x, z) => {
    if (Math.abs(x) > WORLD_HALF || Math.abs(z) > WORLD_HALF) return 0;
    const countryside = smooth(15, 230, cityDistance(x, z));
    if (countryside === 0) return 0;
    const warpX = fbm(x * 0.0021 + 7.2, z * 0.0021 - 3.4) * 42;
    const warpZ = fbm(x * 0.0021 - 4.8, z * 0.0021 + 8.1) * 42;
    const wx = x + warpX, wz = z + warpZ;
    const region = smooth(0.12, 0.72, Math.max(Math.abs(fbm(wx * 0.0012, wz * 0.0012)), 0));
    const edge = smooth(420, 850, Math.max(Math.abs(x), Math.abs(z)));
    const hills = fbm(wx * 0.0042, wz * 0.0042) * (5 + region * 11 + edge * 12);
    const broad = (fbm(wx * 0.0011 + 21, wz * 0.0011 - 15) + 0.18) * (9 + edge * 18);
    let height = (hills + broad) * countryside;
    for (const box of reservations()) {
      if (x >= box.min.x && x <= box.max.x && z >= box.min.z && z <= box.max.z) return 0;
      const d = distanceToBox(x, z, box);
      height *= smooth(3, 18, d);
      if (Math.abs(x - (box.min.x + box.max.x) * 0.5) < 1 && Math.abs(z - (box.min.z + box.max.z) * 0.5) < 1) return 0;
    }
    const bounded = Math.max(-4, Math.min(45, height));
    return Math.abs(bounded) < 1e-9 ? 0 : bounded;
  };
}

export const RELIEF_WORLD_HALF = WORLD_HALF;
