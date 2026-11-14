const CELL_SIZE = 10;

export class NavigationRouter {
  constructor({ halfExtent, cellSize = CELL_SIZE, districtSize = 100 }) {
    this.halfExtent = halfExtent;
    this.cellSize = cellSize;
    this.districtSize = districtSize;
    this.width = Math.floor((halfExtent * 2) / cellSize) + 1;
  }

  route(start, destination, { mode = "walk", obstacles = [], maxVisited = 80000 } = {}) {
    const { halfExtent, cellSize, width } = this;
    const vehicle = mode === "car";
    const toIndex = (x, z) => z * width + x;
    const toCell = (point) => ({
      x: Math.round((point.x + halfExtent) / cellSize),
      z: Math.round((point.z + halfExtent) / cellSize),
    });
    const pointAt = (x, z) => ({ x: x * cellSize - halfExtent, z: z * cellSize - halfExtent });
    const total = width * width, blocked = new Uint8Array(total), radius = vehicle ? 1.15 : 0.55;
    for (const b of obstacles) {
      if ((b.max.y ?? 99) <= 0.25) continue;
      const minX = Math.max(0, Math.floor((b.min.x - radius + halfExtent) / cellSize));
      const maxX = Math.min(width - 1, Math.ceil((b.max.x + radius + halfExtent) / cellSize));
      const minZ = Math.max(0, Math.floor((b.min.z - radius + halfExtent) / cellSize));
      const maxZ = Math.min(width - 1, Math.ceil((b.max.z + radius + halfExtent) / cellSize));
      for (let z = minZ; z <= maxZ; z++) for (let x = minX; x <= maxX; x++) {
        const p = pointAt(x, z);
        if (p.x + radius > b.min.x && p.x - radius < b.max.x && p.z + radius > b.min.z && p.z - radius < b.max.z) blocked[z * width + x] = 1;
      }
    }
    const clear = (x, z) => {
      const p = pointAt(x, z);
      if (p.x < -halfExtent + 2 || p.x > halfExtent - 2 || p.z < -halfExtent + 2 || p.z > halfExtent - 2 || blocked[z * width + x]) return false;
      return true;
    };
    const segmentClear = (a, b) => {
      const length = Math.hypot(b.x - a.x, b.z - a.z), steps = Math.ceil(length / 2);
      for (let i = 1; i < steps; i++) {
        const t = i / steps, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
        if (obstacles.some((box) => (box.max.y ?? 99) > 0.25 && x > box.min.x - radius && x < box.max.x + radius && z > box.min.z - radius && z < box.max.z + radius)) return false;
      }
      return true;
    };
    const nearest = (point) => {
      const c = toCell(point);
      for (let r = 0; r <= 10; r++) {
        let best = null, bestD = Infinity;
        for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
          if (r && Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
          const x = c.x + dx, z = c.z + dz;
          if (x < 0 || z < 0 || x >= width || z >= width || !clear(x, z)) continue;
          const d = (x - c.x) ** 2 + (z - c.z) ** 2;
          if (d < bestD) { bestD = d; best = { x, z }; }
        }
        if (best) return best;
      }
      return null;
    };
    const source = nearest(start), target = nearest(destination);
    if (!source || !target) return null;
    const startId = toIndex(source.x, source.z), goalId = toIndex(target.x, target.z);
    const costs = new Float64Array(total); costs.fill(Infinity); costs[startId] = 0;
    const previous = new Int32Array(total); previous.fill(-1);
    const closed = new Uint8Array(total), open = [];
    const heuristic = (id) => Math.abs(id % width - target.x) + Math.abs(Math.floor(id / width) - target.z);
    const push = (id) => { let i = open.length; open.push(id); while (i) { const parent = (i - 1) >> 1; if (costs[open[parent]] + heuristic(open[parent]) <= costs[id] + heuristic(id)) break; open[i] = open[parent]; i = parent; } open[i] = id; };
    const pop = () => { const first = open[0], last = open.pop(); if (open.length) { let i = 0; while (true) { let child = i * 2 + 1; if (child >= open.length) break; if (child + 1 < open.length && costs[open[child + 1]] + heuristic(open[child + 1]) < costs[open[child]] + heuristic(open[child])) child++; if (costs[last] + heuristic(last) <= costs[open[child]] + heuristic(open[child])) break; open[i] = open[child]; i = child; } open[i] = last; } return first; };
    const directions = [[1,0],[-1,0],[0,1],[0,-1]];
    push(startId);
    let visited = 0;
    while (open.length && visited++ < maxVisited) {
      const id = pop();
      if (id === goalId) break;
      if (closed[id]) continue;
      closed[id] = 1;
      const x = id % width, z = Math.floor(id / width);
      for (const [dx, dz] of directions) {
        const nx = x + dx, nz = z + dz;
        if (nx < 0 || nz < 0 || nx >= width || nz >= width || !clear(nx, nz)) continue;
        if (!segmentClear(pointAt(x, z), pointAt(nx, nz))) continue;
        const next = toIndex(nx, nz); if (closed[next]) continue;
        const candidate = costs[id] + 1;
        if (candidate >= costs[next]) continue;
        costs[next] = candidate; previous[next] = id; push(next);
      }
    }
    if (startId !== goalId && previous[goalId] < 0) return null;
    const cells = []; for (let at = goalId; at >= 0; at = previous[at]) { cells.push(pointAt(at % width, Math.floor(at / width))); if (at === startId) break; }
    cells.reverse();
    const points = [start];
    for (const p of cells) if (Math.hypot(p.x - points.at(-1).x, p.z - points.at(-1).z) >= 7) points.push(p);
    if (Math.hypot(target.x * cellSize - halfExtent - points.at(-1).x, target.z * cellSize - halfExtent - points.at(-1).z) > .1) points.push(pointAt(target.x, target.z));
    points.push(destination);
    let distance = 0; for (let i = 1; i < points.length; i++) distance += Math.hypot(points[i].x - points[i-1].x, points[i].z - points[i-1].z);
    return { points, distance, visited, mode };
  }
}
