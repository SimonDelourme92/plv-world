// Pilot only. Roads and existing inventory footprints stay at their original altitude.
export const PILOT = { minX: 200, maxX: 500, minZ: 200, maxZ: 500 };
const smooth = (a, b, v) => {
  const t = Math.max(0, Math.min(1, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
export function createHeightField(getReservations = () => []) {
  return (x, z) => {
    const p = PILOT,
      edge = Math.min(x - p.minX, p.maxX - x, z - p.minZ, p.maxZ - z);
    if (edge <= 0) return 0;
    const rx = ((x % 100) + 100) % 100,
      rz = ((z % 100) + 100) % 100;
    let mask =
      smooth(7, 45, Math.min(rx, 100 - rx)) *
      smooth(7, 45, Math.min(rz, 100 - rz)) *
      smooth(0, 20, edge);
    if (!mask) return 0;
    for (const b of getReservations()) {
      const dx = Math.max(b.min.x - x, 0, x - b.max.x),
        dz = Math.max(b.min.z - z, 0, z - b.max.z);
      mask *= smooth(3, 12, Math.hypot(dx, dz));
      if (!mask) return 0;
    }
    // Broad irregular swells; a peripheral outcrop reaches about 45 m.
    const hill =
      9 +
      6 * Math.sin(x * 0.024 + z * 0.013) +
      4 * Math.cos(z * 0.037 - x * 0.011);
    const outcrop =
      42 * Math.exp(-((x - 457) ** 2 / 650 + (z - 451) ** 2 / 950));
    const valley = 8 * Math.exp(-((x - 251) ** 2 / 850 + (z - 354) ** 2 / 720));
    return mask * (hill + outcrop - valley);
  };
}
