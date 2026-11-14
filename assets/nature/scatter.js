const hash = (x, z) => { let n = Math.imul(x + 374761393, 668265263) ^ Math.imul(z + 1274126177, 2246822519); n = Math.imul(n ^ n >>> 13, 1274126177); return (n >>> 0) / 4294967295; };
export function scatterNature({ halfExtent = 1000, reservations = [], routes = [], water = () => false, density = 'medium' } = {}) {
  const amounts = { off: 0, low: 450, medium: 1100, high: 2200 }, count = amounts[density] ?? amounts.medium, result = [];
  const blocked = (x, z) => reservations.some(b => x > b.min.x - 8 && x < b.max.x + 8 && z > b.min.z - 8 && z < b.max.z + 8) || routes.some(r => r.points.some((p, i) => {
    if (!i) return false;
    const a = r.points[i - 1], dx = p.x - a.x, dz = p.z - a.z, l2 = dx * dx + dz * dz;
    const t = l2 ? Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / l2)) : 0;
    return Math.hypot(x - a.x - dx * t, z - a.z - dz * t) < r.width / 2 + 2.5;
  })) || water(x, z);
  for (let i = 0; i < count; i++) {
    const gx = (i * 97) % (halfExtent * 2) - halfExtent, gz = (i * 193) % (halfExtent * 2) - halfExtent;
    const x = gx + (hash(i, 4) - .5) * 44, z = gz + (hash(i, 9) - .5) * 44;
    if (blocked(x, z) || Math.hypot(x, z) < 90) continue;
    result.push({ x, z, species: Math.floor(hash(i, 12) * 10), scale: .72 + hash(i, 18) * .68, rotation: hash(i, 23) * Math.PI * 2 });
  }
  return result;
}
