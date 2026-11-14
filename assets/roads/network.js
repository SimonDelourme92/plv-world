const segmentDistance = (p, a, b) => {
  const dx = b.x - a.x, dz = b.z - a.z, l2 = dx * dx + dz * dz;
  const t = l2 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / l2)) : 0;
  return Math.hypot(p.x - (a.x + t * dx), p.z - (a.z + t * dz));
};
export function createRoadNetwork({ reservations = [], water = () => false, seed = 1731 } = {}) {
  const points = [
    { x: -620, z: -120 }, { x: -470, z: -310 }, { x: -180, z: -430 },
    { x: 160, z: -390 }, { x: 480, z: -220 }, { x: 610, z: 60 },
    { x: 500, z: 330 }, { x: 220, z: 520 }, { x: -120, z: 470 },
    { x: -430, z: 300 }, { x: -620, z: 80 },
  ];
  const main = points.map((p, i) => ({ x: p.x + Math.sin(i * 2.7 + seed) * 18, z: p.z + Math.cos(i * 1.9 + seed) * 14 }));
  const roads = [{ id: 'boucle-principale', width: 7, points: main }];
  const branches = [
    [{ x: 0, z: -400 }, { x: -35, z: -250 }, { x: 0, z: -80 }, { x: 0, z: 0 }],
    [{ x: 500, z: 330 }, { x: 350, z: 250 }, { x: 120, z: 150 }, { x: 0, z: 0 }],
    [{ x: -430, z: 300 }, { x: -280, z: 220 }, { x: -80, z: 80 }, { x: 0, z: 0 }],
  ];
  for (let i = 0; i < branches.length; i++) roads.push({ id: `liaison-${i + 1}`, width: 5, points: branches[i] });
  const safe = (p, width) => !water(p.x, p.z) && reservations.every(box => {
    const q = { x: Math.max(box.min.x, Math.min(box.max.x, p.x)), z: Math.max(box.min.z, Math.min(box.max.z, p.z)) };
    return Math.hypot(p.x - q.x, p.z - q.z) >= width / 2 + 6;
  });
  const segments = [];
  for (const road of roads) {
    let run = [], part = 0;
    const flush = () => { if (run.length > 1) segments.push({ id: `${road.id}-${part++}`, width: road.width, points: run }); run = []; };
    for (let i = 1; i < road.points.length; i++) {
      const a = road.points[i - 1], b = road.points[i], length = Math.hypot(b.x - a.x, b.z - a.z);
      for (let j = i === 1 ? 0 : 1, count = Math.ceil(length / 8); j <= count; j++) {
        const t = j / count, p = { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
        if (safe(p, road.width)) run.push(p); else flush();
      }
    }
    flush();
  }
  return { roads: segments, segmentDistance };
}
