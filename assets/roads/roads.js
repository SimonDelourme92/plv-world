// Rendu des routes : chaussée texturée (marquages), accotements, carrefours, ponts et lampadaires.
// Les altitudes viennent du profil en long (network.js) : la chaussée suit le terrain modelé.
const ROAD_LIFT = 0.04, SHOULDER = 0.8, TILE = 16; // m de chaussée par répétition de texture

function asphaltTexture(THREE, markings) {
  const w = 128, h = 512, c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = '#3b4246'; g.fillRect(0, 0, w, h);
  // Grain d'enrobé déterministe.
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 5200; i++) { const v = 44 + rnd() * 34 | 0; g.fillStyle = `rgba(${v},${v + 4},${v + 7},${0.35 + rnd() * 0.4})`; g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 2, 1 + rnd() * 2); }
  for (let i = 0; i < 18; i++) { g.fillStyle = `rgba(20,24,26,${0.06 + rnd() * 0.08})`; g.beginPath(); g.ellipse(rnd() * w, rnd() * h, 6 + rnd() * 18, 10 + rnd() * 40, 0, 0, 7); g.fill(); }
  if (markings) {
    g.fillStyle = 'rgba(236,238,232,.92)';
    g.fillRect(w * 0.045, 0, w * 0.03, h); g.fillRect(w * 0.925, 0, w * 0.03, h); // rives continues
    for (let k = 0; k < 2; k++) g.fillRect(w * 0.488, k * h / 2, w * 0.024, h * 0.19); // axe : 3 m tracés, 5 m d'intervalle
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.ClampToEdgeWrapping; t.wrapT = THREE.RepeatWrapping;
  return t;
}
function gravelTexture(THREE) {
  const c = document.createElement('canvas'); c.width = 64; c.height = 256;
  const g = c.getContext('2d'); g.fillStyle = '#8a7f6c'; g.fillRect(0, 0, 64, 256);
  let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 2600; i++) { const v = 105 + rnd() * 60 | 0; g.fillStyle = `rgba(${v},${v - 8},${v - 22},.55)`; g.fillRect(rnd() * 64, rnd() * 256, 1 + rnd() * 2, 1 + rnd() * 2); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapT = THREE.RepeatWrapping; return t;
}

// Bandeau le long d'une polyligne : offsets latéraux [gauche, droite] et altitude par point.
function strip(points, heights, closed, left, right, lift, filter = null) {
  const n = points.length, pos = [], uv = [], idx = [];
  let dist = 0, prevKept = -1;
  const count = closed ? n + 1 : n;
  for (let k = 0; k < count; k++) {
    const i = k % n, p = points[i];
    const before = points[closed ? (i - 1 + n) % n : Math.max(0, i - 1)], after = points[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
    if (k) { const q = points[(k - 1) % n]; dist += Math.hypot(p.x - q.x, p.z - q.z); }
    if (filter && !filter(i)) { prevKept = -1; continue; }
    const dx = after.x - before.x, dz = after.z - before.z, l = Math.hypot(dx, dz) || 1, nx = -dz / l, nz = dx / l, y = heights[i] + lift;
    const base = pos.length / 3;
    pos.push(p.x + nx * left, y, p.z + nz * left, p.x + nx * right, y, p.z + nz * right);
    uv.push(0, dist / TILE, 1, dist / TILE);
    if (prevKept >= 0) idx.push(prevKept, base, prevKept + 1, prevKept + 1, base, base + 1); // faces vers le haut
    prevKept = base;
  }
  return { pos, uv, idx };
}
function merge(THREE, parts) {
  const pos = [], uv = [], idx = [];
  for (const p of parts) { const o = pos.length / 3; pos.push(...p.pos); uv.push(...p.uv); for (const i of p.idx) idx.push(i + o); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals(); g.computeBoundingSphere();
  return g;
}

export function createRoads({ THREE, scene, network, field, groundAt, renderer = null }) {
  const root = new THREE.Group(); root.name = 'Routes'; scene.add(root);
  const aniso = renderer ? Math.min(8, renderer.capabilities.getMaxAnisotropy()) : 1;
  const tex = asphaltTexture(THREE, true), plainTex = asphaltTexture(THREE, false), gravel = gravelTexture(THREE);
  for (const t of [tex, plainTex, gravel]) t.anisotropy = aniso;
  const asphalt = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.93, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const plain = new THREE.MeshStandardMaterial({ map: plainTex, roughness: 0.93, metalness: 0, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
  const shoulderMat = new THREE.MeshStandardMaterial({ map: gravel, roughness: 1, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  const concrete = new THREE.MeshStandardMaterial({ color: 0xb9b4a8, roughness: 0.85, side: THREE.DoubleSide });
  const disposables = [tex, plainTex, gravel, asphalt, plain, shoulderMat, concrete];

  // Chaussées et accotements (hors tabliers : le pont a sa propre structure).
  const roadParts = [], shoulderParts = [];
  for (const road of network.roads) {
    const h = road.width / 2, onDeck = i => !road.deck?.[i];
    roadParts.push(strip(road.points, road.heights, road.closed, h, -h, ROAD_LIFT));
    shoulderParts.push(strip(road.points, road.heights, road.closed, h + SHOULDER, h - 0.05, ROAD_LIFT - 0.02, onDeck));
    shoulderParts.push(strip(road.points, road.heights, road.closed, -h + 0.05, -h - SHOULDER, ROAD_LIFT - 0.02, onDeck));
  }
  const roadMesh = new THREE.Mesh(merge(THREE, roadParts), asphalt); roadMesh.receiveShadow = true; roadMesh.name = 'Chaussées';
  const shoulderMesh = new THREE.Mesh(merge(THREE, shoulderParts), shoulderMat); shoulderMesh.receiveShadow = true; shoulderMesh.name = 'Accotements';
  root.add(shoulderMesh, roadMesh);

  // Carrefours : disque d'enrobé sans marquage sur chaque raccord.
  const byId = new Map(network.roads.map(r => [r.id, r]));
  const junctions = [];
  for (const road of network.roads) if (road.joins) {
    for (const [end, targetId] of [[0, road.joins[0]], [road.points.length - 1, road.joins[1]]]) {
      const target = byId.get(targetId), p = road.points[end];
      let best = 0, bd = Infinity;
      target.points.forEach((q, i) => { const d = (q.x - p.x) ** 2 + (q.z - p.z) ** 2; if (d < bd) { bd = d; best = i; } });
      junctions.push({ x: p.x, z: p.z, y: target.heights[best], r: target.width / 2 + 3.2 });
    }
  }
  const patch = [];
  for (const j of junctions) {
    const seg = 20, o = patch.length;
    patch.push({ pos: [j.x, j.y + ROAD_LIFT + 0.004, j.z], uv: [0.5, 0], idx: [] });
    const ring = { pos: [], uv: [], idx: [] };
    for (let k = 0; k < seg; k++) { const a = k / seg * Math.PI * 2; ring.pos.push(j.x + Math.cos(a) * j.r, j.y + ROAD_LIFT + 0.004, j.z + Math.sin(a) * j.r); ring.uv.push(0.5 + Math.cos(a) * 0.4, Math.sin(a) * 0.4); }
    for (let k = 0; k < seg; k++) ring.idx.push(0, 1 + (k + 1) % seg, 1 + k);
    patch[o].pos.push(...ring.pos); patch[o].uv.push(...ring.uv); patch[o].idx = ring.idx;
  }
  if (patch.length) { const m = new THREE.Mesh(merge(THREE, patch), plain); m.receiveShadow = true; m.name = 'Carrefours'; root.add(m); }

  // Ponts : dalle, garde-corps et piles.
  const slab = [], walls = [], pillars = [];
  for (const road of network.roads) for (const br of road.bridges || []) {
    const ids = [], pts = road.points;
    for (let i = br.from; i <= br.to; i++) ids.push(i);
    const sub = ids.map(i => pts[i]), hs = ids.map(i => road.heights[i]), h = road.width / 2;
    const top = strip(sub, hs, false, h + 0.45, -h - 0.45, ROAD_LIFT - 0.01);
    const under = strip(sub, hs, false, -h - 0.45, h + 0.45, -0.55);
    // Faces latérales : relie le bord haut et le bord bas.
    for (const [edge, flip] of [[h + 0.45, 1], [-h - 0.45, -1]]) {
      const a = strip(sub, hs, false, edge, edge, ROAD_LIFT - 0.01), b = strip(sub, hs, false, edge, edge, -0.55), pos = [], uv = [], idx = [];
      for (let k = 0; k < sub.length; k++) { pos.push(...a.pos.slice(k * 6, k * 6 + 3), ...b.pos.slice(k * 6, k * 6 + 3)); uv.push(0, k, 1, k); if (k) { const p = (k - 1) * 2, c = k * 2; flip > 0 ? idx.push(p, p + 1, c, p + 1, c + 1, c) : idx.push(p, c, p + 1, p + 1, c, c + 1); } }
      slab.push({ pos, uv, idx });
    }
    slab.push(top, under);
    for (const side of [1, -1]) {
      const edge = side * (h + 0.3), inner = side * (h + 0.05);
      walls.push(strip(sub, hs, false, side > 0 ? edge : inner, side > 0 ? inner : edge, ROAD_LIFT + 0.85));
      for (const [off, flip] of [[edge, side], [inner, -side]]) {
        const a = strip(sub, hs, false, off, off, ROAD_LIFT + 0.85), b = strip(sub, hs, false, off, off, ROAD_LIFT), pos = [], uv = [], idx = [];
        for (let k = 0; k < sub.length; k++) { pos.push(...a.pos.slice(k * 6, k * 6 + 3), ...b.pos.slice(k * 6, k * 6 + 3)); uv.push(0, k, 1, k); if (k) { const p = (k - 1) * 2, c = k * 2; flip > 0 ? idx.push(p, p + 1, c, p + 1, c + 1, c) : idx.push(p, c, p + 1, p + 1, c, c + 1); } }
        walls.push({ pos, uv, idx });
      }
    }
    for (let i = br.wetFrom; i <= br.wetTo; i += 5) {
      const p = pts[i], bottom = groundAt(p.x, p.z) - 0.6, topY = road.heights[i] - 0.5;
      if (topY - bottom > 0.2) pillars.push({ x: p.x, z: p.z, y0: bottom, y1: topY });
    }
  }
  if (slab.length) { const m = new THREE.Mesh(merge(THREE, slab), concrete); m.castShadow = m.receiveShadow = true; m.name = 'Tabliers'; root.add(m); }
  if (walls.length) { const m = new THREE.Mesh(merge(THREE, walls), concrete); m.castShadow = true; m.receiveShadow = true; m.name = 'Garde-corps'; root.add(m); }
  if (pillars.length) {
    const geo = new THREE.CylinderGeometry(0.55, 0.65, 1, 12); geo.translate(0, 0.5, 0); disposables.push(geo);
    const m = new THREE.InstancedMesh(geo, concrete, pillars.length), d = new THREE.Object3D();
    pillars.forEach((p, i) => { d.position.set(p.x, p.y0, p.z); d.scale.set(1, p.y1 - p.y0, 1); d.updateMatrix(); m.setMatrixAt(i, d.matrix); });
    m.castShadow = m.receiveShadow = true; m.name = 'Piles'; root.add(m);
  }

  // Lampadaires du boulevard, côté campagne, tous les 30 m.
  const lampPts = [], ring = byId.get('boulevard');
  if (ring) {
    let acc = 15; const pts = ring.points, n = pts.length;
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[(i + 1) % n], l = Math.hypot(b.x - a.x, b.z - a.z); acc += l;
      if (acc < 30) continue; acc = 0;
      const dx = (b.x - a.x) / (l || 1), dz = (b.z - a.z) / (l || 1), nx = -dz, nz = dx; // normale gauche = vers la cité
      const x = a.x - nx * 4.25, z = a.z - nz * 4.25; // pied côté campagne, bras vers la chaussée
      if (junctions.some(j => Math.hypot(j.x - x, j.z - z) < 12)) continue;
      lampPts.push({ x, z, y: ring.heights[i], yaw: Math.atan2(nx, nz) });
    }
  }
  const poleGeo = new THREE.CylinderGeometry(0.07, 0.11, 7, 8); poleGeo.translate(0, 3.5, 0);
  const armGeo = new THREE.BoxGeometry(0.08, 0.08, 1.9); armGeo.translate(0, 6.95, 0.85);
  const headGeo = new THREE.BoxGeometry(0.34, 0.12, 0.62); headGeo.translate(0, 6.86, 1.7);
  disposables.push(poleGeo, armGeo, headGeo);
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x2b3439, roughness: 0.6, metalness: 0.4 });
  const glowMat = new THREE.MeshStandardMaterial({ color: 0xf4f1e4, emissive: 0xffe2a8, emissiveIntensity: 0.15, roughness: 0.4 });
  disposables.push(poleMat, glowMat);
  const lamps = [];
  for (const [geo, mat] of [[poleGeo, poleMat], [armGeo, poleMat], [headGeo, glowMat]]) {
    const m = new THREE.InstancedMesh(geo, mat, Math.max(1, lampPts.length)), d = new THREE.Object3D();
    lampPts.forEach((p, i) => { d.position.set(p.x, p.y + ROAD_LIFT, p.z); d.rotation.set(0, p.yaw, 0); d.updateMatrix(); m.setMatrixAt(i, d.matrix); });
    m.count = lampPts.length; m.castShadow = geo === poleGeo; m.name = 'Lampadaires'; root.add(m); lamps.push(m);
  }

  const km = network.roads.reduce((s, r) => s + r.points.reduce((a, p, i) => i ? a + Math.hypot(p.x - r.points[i - 1].x, p.z - r.points[i - 1].z) : a, 0), 0) / 1000;
  const statistics = { routesKm: +km.toFixed(2), ponts: network.roads.reduce((s, r) => s + (r.bridges?.length || 0), 0), lampadaires: lampPts.length, carrefours: junctions.length };
  return {
    root, network, field, statistics,
    setNight(night) { glowMat.emissiveIntensity = night ? 2.2 : 0.15; },
    setVisible(v) { root.visible = v; },
    dispose() { root.removeFromParent(); root.traverse(o => o.geometry?.dispose()); for (const d of disposables) d.dispose(); },
  };
}

// Dessin 2D pour la carte et la mini-carte : toPx(x,z) -> [px,py], scale = px par mètre.
export function drawRoads(ctx, network, toPx, scale) {
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const pass of [0, 1]) for (const road of network.roads) {
    ctx.beginPath();
    road.points.forEach((p, i) => { const [x, y] = toPx(p.x, p.z); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    if (road.closed) ctx.closePath();
    ctx.lineWidth = Math.max(pass ? 1.2 : 2.6, road.width * scale * (pass ? 1 : 1.5));
    ctx.strokeStyle = pass ? (road.kind === 'boulevard' ? '#f2efe6' : '#e4dccb') : 'rgba(40,46,50,.55)';
    ctx.stroke();
  }
  ctx.restore();
}
