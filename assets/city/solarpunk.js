// Quartier solarpunk : 7 bâtiments inspirés de projets réels, dalle béton, rues, rond-point.
// Version jeu des rendus de concept : verre transparent sans réfraction, végétation légère
// sur les bâtiments, détails fins (intérieurs, plantes, mobilier) affichés seulement de près.
// Textures Poly Haven (CC0) en WebP 512 px : voir tex/sources.json.
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { BUILDINGS, STREETS, ROUNDABOUT, CROSSINGS, STREET, SOLAR_BOX, SLAB_TOP } from './layout.js';

const FINE_DISTANCE = 350; // m : intérieurs, plantes, mobilier

export async function createSolarDistrict({ THREE, scene }) {
  const root = new THREE.Group(); root.name = 'Quartier solarpunk'; scene.add(root);
  let seed = 4242; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647, rr = (a, b) => a + rnd() * (b - a);
  const disposables = [];

  // ---------- matériaux ----------
  const tl = new THREE.TextureLoader(), texBase = new URL('./tex/', import.meta.url).href, cache = {};
  const load = (file, color) => { if (!cache[file]) { const t = tl.load(texBase + file); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; if (color) t.colorSpace = THREE.SRGBColorSpace; cache[file] = t; disposables.push(t); } return cache[file]; };
  const pbr = (name, size, o = {}) => { const map = load(name + '-couleur.webp', true).clone(), normalMap = load(name + '-normale.webp').clone(); for (const t of [map, normalMap]) { t.repeat.set(1 / size, 1 / size); t.needsUpdate = true; disposables.push(t); } const m = new THREE.MeshStandardMaterial({ map, normalMap, roughness: 0.85, ...o }); disposables.push(m); return m; };
  const std = o => { const m = new THREE.MeshStandardMaterial(o); disposables.push(m); return m; };
  const M = {
    deck: pbr('bois-terrasse', 2.2, { side: THREE.DoubleSide }), clt: pbr('contreplaque', 2.4, { side: THREE.DoubleSide }), glulam: pbr('lamelle', 3, { side: THREE.DoubleSide }),
    concrete: pbr('beton', 4, { side: THREE.DoubleSide }), bed: pbr('pelouse', 4, { color: '#8fbf6c', side: THREE.DoubleSide }), terracotta: pbr('terre-cuite', 2, { side: THREE.DoubleSide }),
    asphalt: pbr('asphalte', 5, { color: '#8a8a88', roughness: 0.95 }), slab: pbr('dalle', 6, { color: '#e8eaea', roughness: 0.9 }), sidewalk: pbr('trottoir', 2.2, { color: '#e2ddd5' }),
    trunkWood: pbr('lamelle', 2, { color: '#c49a6c' }), latticeWood: pbr('lamelle', 3, { color: '#c8956a' }), polished: pbr('beton', 6, { color: '#d6d3cc', roughness: 0.35 }),
    hanging: pbr('pelouse', 1.5, { color: '#5f8f45', side: THREE.DoubleSide }),
    steel: std({ color: '#f1f1ec', metalness: 0.55, roughness: 0.32 }), white: std({ color: '#f4f3ef', roughness: 0.45, metalness: 0.1 }),
    bronze: std({ color: '#4a4036', metalness: 0.8, roughness: 0.35 }), fin: std({ color: '#d8cdb4', metalness: 0.7, roughness: 0.3 }), curb: std({ color: '#c9c7c2', roughness: 0.7 }),
    glass: new THREE.MeshPhysicalMaterial({ color: '#e6f6ff', metalness: 0.1, roughness: 0.04, transparent: true, opacity: 0.2, envMapIntensity: 1.5, depthWrite: false, side: THREE.DoubleSide }),
    glassRail: new THREE.MeshPhysicalMaterial({ color: '#e8fff6', metalness: 0, roughness: 0.04, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide }),
    curtain: new THREE.MeshPhysicalMaterial({ color: '#4f7480', metalness: 0.85, roughness: 0.06, envMapIntensity: 1.3, clearcoat: 1, side: THREE.DoubleSide }),
    curtainLit: new THREE.MeshPhysicalMaterial({ color: '#4f7480', metalness: 0.85, roughness: 0.06, envMapIntensity: 1.3, clearcoat: 1, emissive: '#ffd59a', emissiveIntensity: 0 }),
    water: new THREE.MeshPhysicalMaterial({ color: '#2f6f73', roughness: 0.05, metalness: 0.1, clearcoat: 1 }),
    light: std({ color: '#fff3df', emissive: '#ffcf8a', emissiveIntensity: 0 }), beacon: std({ color: '#ffffff', emissive: '#9ff6ff', emissiveIntensity: 1.5 }),
    lamp: std({ color: '#ffffff', emissive: '#ffe1a6', emissiveIntensity: 0.2 }),
    paint: std({ color: '#f2f1ea', roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    joint: std({ color: '#8d8f8f', roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }),
    plant: std({ vertexColors: true, roughness: 0.9, flatShading: true }),
  };
  disposables.push(M.glass, M.glassRail, M.curtain, M.curtainLit, M.water);
  // Cellules photovoltaïques et écailles solaires (procédural).
  const canvasTex = (w, h, draw, repeat = 1) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); t.anisotropy = 8; disposables.push(t); return t; };
  M.pv = std({ map: canvasTex(256, 256, g => { g.fillStyle = '#c9d1d8'; g.fillRect(0, 0, 256, 256); for (let y = 0; y < 8; y++) for (let x = 0; x < 4; x++) { g.fillStyle = '#16243a'; g.fillRect(x * 64 + 2, y * 32 + 2, 60, 28); } }), metalness: 0.6, roughness: 0.18, side: THREE.DoubleSide });
  M.scales = std({ map: canvasTex(512, 512, g => { g.fillStyle = '#5d6872'; g.fillRect(0, 0, 512, 512); const r = 32; for (let row = -1; row < 18; row++) for (let col = -1; col < 9; col++) { const cx = col * 64 + (row % 2 ? 32 : 0) + 32, cy = row * 28 + 20, gr = g.createLinearGradient(cx, cy - r, cx, cy + r); gr.addColorStop(0, '#c8d3dc'); gr.addColorStop(0.55, '#7f93a6'); gr.addColorStop(1, '#2d3a48'); g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI); g.lineTo(cx - r, cy); g.fill(); g.strokeStyle = 'rgba(20,28,36,.6)'; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI); g.stroke(); } }, 1 / 4), metalness: 0.75, roughness: 0.28 });

  // ---------- géométries utilitaires (UV en mètres) ----------
  let target = root;
  const add = (geo, mat, x = 0, y = 0, z = 0, o = {}) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); if (o.ry) m.rotation.y = o.ry; m.castShadow = o.cast ?? true; m.receiveShadow = true; (o.parent || target).add(m); return m; };
  const mbox = (w, h, d) => { const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv; for (let f = 0; f < 6; f++) { const sx = f < 2 ? d : w, sy = f === 2 || f === 3 ? d : h; for (let i = 0; i < 4; i++) { const k = f * 4 + i; uv.setXY(k, uv.getX(k) * sx, uv.getY(k) * sy); } } return g; };
  const mcyl = (rt, rb, h, seg = 48, open = false) => { const g = new THREE.CylinderGeometry(rt, rb, h, seg, 1, open), uv = g.attributes.uv, p = g.attributes.position; for (let i = 0; i < uv.count; i++) { if (Math.abs(Math.abs(p.getY(i)) - h / 2) < 1e-4 && Math.abs(g.attributes.normal.getY(i)) > 0.5) uv.setXY(i, p.getX(i), p.getZ(i)); else uv.setXY(i, uv.getX(i) * Math.PI * 2 * rb, uv.getY(i) * h); } return g; };
  const inst = (geo, mat, mats, cast = true) => { if (!mats.length) return null; const m = new THREE.InstancedMesh(geo, mat, mats.length); mats.forEach((x, i) => m.setMatrixAt(i, x)); m.castShadow = cast; m.receiveShadow = true; target.add(m); return m; };
  const mat4 = (x, y, z, ry = 0, sx = 1, sy = 1, sz = 1, rx = 0, rz = 0) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')), new THREE.Vector3(sx, sy, sz));
  const beamMatrix = (a, b, w, d) => { const v = new THREE.Vector3().subVectors(b, a), len = v.length(), mid = a.clone().add(b).multiplyScalar(0.5); return new THREE.Matrix4().compose(mid, new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize()), new THREE.Vector3(w, len, d)); };
  const quadMesh = (quads, mat) => { const pos = [], uv = [], idx = []; for (const [a, b, c, d] of quads) { const o = pos.length / 3; pos.push(...a, ...b, ...c, ...d); const w = Math.hypot(b[0] - a[0], b[2] - a[2]), h = Math.abs(d[1] - a[1]); uv.push(0, 0, w, 0, w, h, 0, h); idx.push(o, o + 1, o + 2, o, o + 2, o + 3); } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return add(g, mat); };
  const UNIT = new THREE.BoxGeometry(1, 1, 1); disposables.push(UNIT);

  // ---------- végétation légère (couleurs de sommets, ~80 à 260 triangles) ----------
  const colorize = (geo, hex, jitter = 0.06) => { geo = geo.index ? geo.toNonIndexed() : geo; const c = new THREE.Color(hex), n = geo.attributes.position.count, col = new Float32Array(n * 3); for (let i = 0; i < n; i += 3) { const k = 1 + (rnd() - 0.5) * jitter * 2; for (let j = 0; j < 3; j++) { col[(i + j) * 3] = c.r * k; col[(i + j) * 3 + 1] = c.g * k; col[(i + j) * 3 + 2] = c.b * k; } } geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.deleteAttribute('uv'); return geo; };
  const mergeColored = parts => { const pos = [], nor = [], col = []; for (const g of parts) { g.computeVertexNormals(); pos.push(...g.attributes.position.array); nor.push(...g.attributes.normal.array); col.push(...g.attributes.color.array); g.dispose(); } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); disposables.push(g); return g; };
  const ico = (r, x, y, z, sy = 1) => new THREE.IcosahedronGeometry(r, 1).scale(1, sy, 1).translate(x, y, z);
  const PLANTS = {
    tree: mergeColored([colorize(new THREE.CylinderGeometry(0.13, 0.22, 2.4, 6).translate(0, 1.2, 0), '#6b4a32'), colorize(ico(1.45, 0, 3.1, 0, 0.9), '#4f8a3a'), colorize(ico(1.0, 0.75, 3.75, 0.35), '#5f9c43'), colorize(ico(0.95, -0.7, 3.5, -0.45), '#447c35')]),
    conifer: mergeColored([colorize(new THREE.CylinderGeometry(0.12, 0.18, 1.6, 6).translate(0, 0.8, 0), '#5a3f2b'), colorize(new THREE.ConeGeometry(1.5, 2.6, 7).translate(0, 2.4, 0), '#2f6a3c'), colorize(new THREE.ConeGeometry(1.1, 2.1, 7).translate(0, 3.7, 0), '#357444')]),
    bush: mergeColored([colorize(ico(0.65, 0, 0.45, 0, 0.7), '#4f8a3a'), colorize(ico(0.45, 0.4, 0.55, 0.15, 0.8), '#5e9a42')]),
    flower: mergeColored([colorize(ico(0.6, 0, 0.42, 0, 0.7), '#4a8236'), ...[[0.3, 0.75, 0.2, '#e78fb3'], [-0.25, 0.7, -0.2, '#f2d35b'], [0.05, 0.8, -0.3, '#c58ae0'], [-0.35, 0.6, 0.25, '#e78fb3']].map(([x, y, z, c]) => colorize(new THREE.IcosahedronGeometry(0.13, 0).translate(x, y, z), c))]),
    fern: mergeColored([0, 1, 2, 3, 4].map(k => colorize(new THREE.ConeGeometry(0.16, 0.9, 4).rotateZ(0.9).translate(0.35, 0.3, 0).rotateY(k * 1.26), '#3f7d34'))),
  };
  const SPECIES = { 'feuillu-rond': ['tree', 1.5], 'arbre-feuillu': ['tree', 1.5], 'feuillu-eleve': ['tree', 1.6], 'pin-touffu': ['conifer', 1.6], 'buisson': ['bush', 1.1], 'buisson-fleuri': ['flower', 1.1], 'fougere': ['fern', 1] };
  let plantings = {};
  const plant = (id, x, y, z, s = 1) => { const [kind, k] = SPECIES[id]; (plantings[kind] ||= []).push(mat4(x, y, z, rnd() * 6.28, s * k, s * k, s * k)); };
  const flushPlants = () => { for (const [kind, list] of Object.entries(plantings)) inst(PLANTS[kind], M.plant, list, kind === 'tree' || kind === 'conifer'); plantings = {}; };

  // ---------- bâtiments : groupe principal + groupe « détails » (proche) ----------
  const buildings = [];
  const byId = Object.fromEntries(BUILDINGS.map(b => [b.id, b]));
  function building(id, fn) {
    const def = byId[id], g = new THREE.Group(), fine = new THREE.Group(); g.name = def.nom; fine.name = def.nom + ' — détails'; root.add(g); g.add(fine);
    const prev = target; target = g;
    const detail = f => { const p = target; target = fine; f(); target = p; };
    fn(def, detail);
    target = fine; flushPlants(); target = prev;
    buildings.push({ def, group: g, fine });
  }

  // 1. LA SPIRALE (150 m) — d'après la tour Occitanie (Libeskind)
  building('spirale', ({ x, z, h: H }, detail) => {
    const R = 15, Rg = 15.6, fh = 3.6, core = 5.5, floors = Math.floor((H - 6) / fh);
    add(mcyl(core, core, H, 32), M.concrete, x, H / 2, z);
    const slabM = [], lightM = [], colM = [];
    for (let f = 0; f <= floors; f++) { const y = 0.5 + f * fh; slabM.push(mat4(x, y, z)); if (f) lightM.push(mat4(x, y - 0.26, z)); }
    inst(mcyl(R, R, 0.42, 48), M.clt, slabM); inst(new THREE.RingGeometry(core + 1, R - 1.5, 40).rotateX(Math.PI / 2), M.light, lightM, false);
    for (let k = 0; k < 18; k++) { const a = k / 18 * Math.PI * 2; colM.push(mat4(x + Math.cos(a) * (R - 1.2), H / 2, z + Math.sin(a) * (R - 1.2), -a, 0.55, H, 0.55)); }
    inst(mbox(1, 1, 1), M.glulam, colM);
    detail(() => {
      const desk = [], pot = [];
      for (let f = 1; f < floors; f++) { const y = 0.5 + f * fh + 0.21; for (let k = 0; k < 6; k++) { const a = rnd() * Math.PI * 2, r = rr(core + 2.5, R - 3); desk.push(mat4(x + Math.cos(a) * r, y + 0.37, z + Math.sin(a) * r, -a, 1.8, 0.74, 0.8)); if (k < 2) { const a2 = rnd() * 6.28, r2 = rr(R - 3.2, R - 2); pot.push(mat4(x + Math.cos(a2) * r2, y + 0.3, z + Math.sin(a2) * r2, 0, 0.5, 0.6, 0.5)); plant('buisson', x + Math.cos(a2) * r2, y + 0.6, z + Math.sin(a2) * r2, 0.9); } } }
      inst(mbox(1, 1, 1), M.deck, desk); inst(new THREE.CylinderGeometry(0.5, 0.4, 1, 8), M.terracotta, pot);
    });
    const glass = add(mcyl(Rg, Rg, H - 0.5, 72, true), M.glass, x, H / 2, z, { cast: false }); glass.renderOrder = 2;
    const mull = [], tr = [], nM = Math.round(2 * Math.PI * Rg / 2.4);
    for (let k = 0; k < nM; k++) { const a = k / nM * Math.PI * 2; mull.push(mat4(x + Math.cos(a) * (Rg + 0.05), H / 2, z + Math.sin(a) * (Rg + 0.05), -a, 0.08, H - 0.5, 0.18)); }
    inst(UNIT, M.bronze, mull);
    for (let f = 0; f <= floors; f++) tr.push(mat4(x, 0.5 + f * fh + 0.2, z));
    inst(new THREE.TorusGeometry(Rg + 0.05, 0.09, 4, 72).rotateX(Math.PI / 2), M.bronze, tr, false);
    // Ruban-jardin en spirale.
    const turns = 3.4, y0 = 9, y1 = H - 5, N = 600, theta0 = 0.6;
    const at = (t, r, dy = 0) => { const th = theta0 + t * turns * Math.PI * 2; return [x + Math.cos(th) * r, y0 + t * (y1 - y0) + dy, z + Math.sin(th) * r]; };
    const strip = (fnPts, mat) => { const pos = [], uv = [], idx = []; let len = 0; for (let i = 0; i <= N; i++) { const t = i / N, [a, b, w] = fnPts(t); if (i) { const [pa] = fnPts((i - 1) / N); len += Math.hypot(a[0] - pa[0], a[1] - pa[1], a[2] - pa[2]); } pos.push(...a, ...b); uv.push(0, len, w, len); if (i) { const j = (i - 1) * 2; idx.push(j, j + 2, j + 1, j + 1, j + 2, j + 3); } } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return add(g, mat); };
    const flat = (r0, r1, dy, mat) => strip(t => [at(t, r0, dy), at(t, r1, dy), r1 - r0], mat);
    const wall = (r, a, b, mat) => strip(t => [at(t, r, a), at(t, r, b), b - a], mat);
    const rWalk = Rg + 0.15, rBed = Rg + 3.4, rOut = Rg + 7;
    flat(rWalk, rBed, 0, M.deck); flat(rBed, rOut - 0.3, 0.55, M.bed); flat(Rg, rOut, -0.6, M.concrete);
    wall(rBed, 0, 0.55, M.glulam); wall(rOut, -0.6, 0.6, M.glulam);
    const rail = wall(rOut + 0.05, 0.6, 1.75, M.glassRail); rail.castShadow = false; rail.renderOrder = 2; wall(rOut + 0.05, 1.72, 1.8, M.bronze);
    detail(() => {
      const nP = Math.floor(turns * 2 * Math.PI * (rBed + 1.6) / 2.4);
      for (let k = 0; k < nP; k++) { const t = (k + 0.5) / nP, [px, py, pz] = at(t, rBed + rr(1.2, 2.4), 0.55), r = k % 3; plant(r === 0 ? 'feuillu-rond' : r === 1 ? (rnd() < 0.6 ? 'buisson-fleuri' : 'buisson') : 'fougere', px, py, pz, r === 0 ? rr(0.6, 0.85) : rr(0.8, 1.2)); }
      const bench = []; for (let k = 0; k < 40; k++) { const t = (k + 0.3) / 40, [bx, by, bz] = at(t, rWalk + 0.6, 0.23); bench.push(mat4(bx, by, bz, -(theta0 + t * turns * Math.PI * 2), 0.5, 0.45, 1.8)); }
      inst(mbox(1, 1, 1), M.glulam, bench);
    });
    const top = 0.5 + floors * fh + 0.21; add(mcyl(R + 1, R + 1, 0.6, 48), M.bed, x, top + 0.3, z);
    const perg = []; for (let k = 0; k < 12; k++) { const a = k / 12 * 6.28; perg.push(mat4(x + Math.cos(a) * (R - 0.5), top + 2.4, z + Math.sin(a) * (R - 0.5), 0, 0.35, 4, 0.35)); }
    inst(mbox(1, 1, 1), M.glulam, perg); add(new THREE.TorusGeometry(R - 0.5, 0.25, 6, 48).rotateX(Math.PI / 2), M.glulam, x, top + 4.4, z);
    for (let k = 0; k < 6; k++) { const a = k / 6 * 6.28 + 0.3, pv = add(new THREE.PlaneGeometry(9, 4.5), M.pv, x + Math.cos(a) * 9, top + 4.8, z + Math.sin(a) * 9); pv.rotation.set(-Math.PI / 2 + 0.35, -a - Math.PI / 2, 0, 'YXZ'); }
    detail(() => { for (let k = 0; k < 9; k++) { const a = k / 9 * 6.28, r = rr(4, R - 2); plant(k % 3 ? 'feuillu-eleve' : 'pin-touffu', x + Math.cos(a) * r, top + 0.6, z + Math.sin(a) * r, rr(0.5, 0.7)); } });
    add(mcyl(Rg + 6, Rg + 6, 0.5, 48), M.glulam, x, 6.5, z);
    buildings.spirale = { x, z, Rg, at };
  });

  // 2. LA RUCHE (172 m) — d'après Atlassian Central (SHoP + BVN)
  building('ruche', ({ x, z }, detail) => {
    const W = 34, fh = 3.8, habitats = 7, podium = 12, gap = 6, hab = 4 * fh, mod = hab + gap, Htot = podium + habitats * mod + 8, h2 = W / 2;
    add(mbox(11, Htot, 11), M.concrete, x - 4, Htot / 2, z + 3);
    const slabM = [], colM = [], finM = [], glassM = [], lightM = [], gardenM = [];
    for (let h = 0; h < habitats; h++) {
      const yb = podium + h * mod, inset = W / 2 - 2.6;
      for (let f = 0; f <= 4; f++) { slabM.push(mat4(x, yb + f * fh, z)); if (f && f < 4) lightM.push(mat4(x, yb + f * fh - 0.24, z)); }
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) colM.push(mat4(x - 12 + i * 8, yb + hab / 2, z - 12 + j * 8, 0, 0.6, hab, 0.6));
      for (const [nx, nz, ry] of [[0, 1, 0], [0, -1, Math.PI], [1, 0, Math.PI / 2], [-1, 0, -Math.PI / 2]]) glassM.push(mat4(x + nx * inset, yb + hab / 2, z + nz * inset, ry, W - 5.4, hab - 0.4, 1));
      for (let k = 0; k < 24; k++) { const s = -inset + 0.6 + k * (2 * inset - 1.2) / 23; finM.push(mat4(x + s, yb + hab / 2, z + inset + 0.45, 0, 0.14, hab - 0.5, 0.7)); finM.push(mat4(x - inset - 0.45, yb + hab / 2, z + s, 0, 0.7, hab - 0.5, 0.14)); }
      const yg = yb + hab; gardenM.push(mat4(x, yg + 0.45, z));
      detail(() => { for (let k = 0; k < 8; k++) { const px = x + rr(-13, 13), pz = z + rr(-13, 13); if (Math.abs(px - x + 4) < 7 && Math.abs(pz - z - 3) < 7) continue; plant(k % 3 ? 'feuillu-rond' : 'feuillu-eleve', px, yg + 0.7, pz, rr(0.45, 0.62)); } for (let k = 0; k < 10; k++) plant(k % 2 ? 'buisson-fleuri' : 'fougere', x + rr(-15, 15), yg + 0.7, z + rr(-15, 15), rr(0.8, 1.2)); const desk = []; for (let f = 0; f < 4; f++) for (let k = 0; k < 6; k++) desk.push(mat4(x + rr(-11, 11), yb + f * fh + 0.58, z + rr(-11, 11), rnd() * 3, 1.8, 0.74, 0.8)); inst(mbox(1, 1, 1), M.deck, desk); });
    }
    inst(mbox(W - 4, 0.4, W - 4), M.clt, slabM); inst(new THREE.PlaneGeometry(W - 9, W - 9).rotateX(Math.PI / 2), M.light, lightM, false);
    inst(mbox(1, 1, 1), M.glulam, colM); inst(mbox(1, 1, 1), M.glulam, finM); const gl = inst(new THREE.PlaneGeometry(1, 1), M.glass, glassM, false); gl.renderOrder = 2;
    inst(mbox(W - 3, 0.5, W - 3), M.bed, gardenM);
    // Exosquelette : croix d'acier blanc empilées en losanges, ceintures, poteaux d'angle.
    const beams = [], faces = [s => new THREE.Vector3(x + s, 0, z + h2), s => new THREE.Vector3(x + s, 0, z - h2), s => new THREE.Vector3(x + h2, 0, z + s), s => new THREE.Vector3(x - h2, 0, z + s)];
    for (const P of faces) for (let k = 0; k < habitats; k++) { const ya = podium + k * mod - (k ? gap / 2 : 0), yb2 = podium + (k + 1) * mod - gap / 2; const a = P(-h2); a.y = ya; const b = P(h2); b.y = yb2; const c = P(h2); c.y = ya; const d = P(-h2); d.y = yb2; beams.push(beamMatrix(a, b, 1.1, 1.1), beamMatrix(c, d, 1.1, 1.1)); }
    for (const [cx, cz] of [[-h2, -h2], [h2, -h2], [-h2, h2], [h2, h2]]) beams.push(mat4(x + cx, Htot / 2, z + cz, 0, 1.4, Htot, 1.4));
    for (let k = 0; k <= habitats; k++) { const y = podium + k * mod - (k ? gap / 2 : 0); beams.push(mat4(x, y, z + h2, 0, W, 0.9, 0.9), mat4(x, y, z - h2, 0, W, 0.9, 0.9), mat4(x + h2, y, z, 0, 0.9, 0.9, W), mat4(x - h2, y, z, 0, 0.9, 0.9, W)); }
    inst(UNIT, M.steel, beams);
    const pvM = []; for (let y = podium + 2; y < Htot - 10; y += 2.2) for (let k = 0; k < 5; k++) pvM.push(mat4(x + h2 + 1.6, y, z - 12 + k * 6, 0, 1, 1, 1, 0, 0.6));
    inst(new THREE.PlaneGeometry(5.4, 1.6).rotateY(Math.PI / 2), M.pv, pvM);
    for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) add(mbox(0.9, podium, 0.9), M.glulam, x - 16 + i * 8, podium / 2, z - 16 + j * 8);
    const lobby = add(mbox(20, podium - 2, 16), M.glass, x + 4, podium / 2, z - 6, { cast: false }); lobby.renderOrder = 2;
    const top = podium + habitats * mod; add(mbox(W, 0.8, W), M.bed, x, top + 0.4, z);
    detail(() => { for (let k = 0; k < 10; k++) plant(k % 2 ? 'pin-touffu' : 'feuillu-rond', x + rr(-14, 14), top + 0.8, z + rr(-14, 14), rr(0.5, 0.7)); });
    add(mbox(12, 4, 8), M.glass, x + 8, top + 2.8, z - 8, { cast: false }).renderOrder = 2; add(mbox(13, 0.4, 9), M.glulam, x + 8, top + 5, z - 8);
    for (const [dx, dz] of [[-12, 12], [-12, -12], [12, 12]]) { add(new THREE.CylinderGeometry(0.25, 0.3, 14, 8), M.steel, x + dx, top + 7, z + dz); for (let b = 0; b < 3; b++) { const blade = add(new THREE.BoxGeometry(0.15, 8, 1.2), M.steel, x + dx + Math.cos(b * 2.09) * 1.8, top + 10, z + dz + Math.sin(b * 2.09) * 1.8); blade.rotation.set(0, -b * 2.09, 0.35); } }
    buildings.ruche = { x, z, W };
  });

  // 3. LA FUSÉE (100 m) — d'après Rocket & Tigerli (Winterthur)
  building('fusee', ({ x, z, h: H }, detail) => {
    const W = 26, nF = 9, depth = 1.3, podium = 7.2, fh = 3.1, h2 = W / 2, terra = [], glassQ = [], niches = [];
    const faces = [(s, o) => [x + s, z + h2 + o], (s, o) => [x - s, z - h2 - o], (s, o) => [x + h2 + o, z - s], (s, o) => [x - h2 - o, z + s]];
    for (const P of faces) for (let k = 0; k < nF * 2; k++) { const s0 = -h2 + k * W / (nF * 2), s1 = s0 + W / (nF * 2), [ax, az] = P(s0, k % 2 ? depth : 0), [bx, bz] = P(s1, k % 2 ? 0 : depth); (k % 2 ? glassQ : terra).push([[ax, podium, az], [bx, podium, bz], [bx, H, bz], [ax, H, az]]); if (k % 2) for (let f = 1; f < 30; f++) if (rnd() < 0.16) niches.push([(ax + bx) / 2, podium + f * fh, (az + bz) / 2, Math.atan2(bx - ax, bz - az)]); }
    quadMesh(terra, M.terracotta); const gq = quadMesh(glassQ, M.glass); gq.castShadow = false; gq.renderOrder = 2;
    const spand = []; for (const [a, b] of glassQ) { const ry = -Math.atan2(b[2] - a[2], b[0] - a[0]); for (let f = 0; f <= 30; f++) spand.push(mat4((a[0] + b[0]) / 2, podium + f * fh, (a[2] + b[2]) / 2, ry, Math.hypot(b[0] - a[0], b[2] - a[2]), 0.9, 0.22)); }
    inst(UNIT, M.terracotta, spand);
    const slabs = []; for (let f = 0; f <= 30; f++) slabs.push(mat4(x, podium + f * fh, z)); inst(mbox(W - 0.8, 0.35, W - 0.8), M.clt, slabs);
    detail(() => { const desk = [], pots = []; for (let f = 0; f < 30; f++) for (let k = 0; k < 4; k++) desk.push(mat4(x + rr(-9, 9), podium + f * fh + 0.55, z + rr(-9, 9), rnd() * 3, 1.6, 0.74, 0.8)); inst(mbox(1, 1, 1), M.deck, desk); for (const [nx, ny, nz, ry] of niches) { pots.push(mat4(nx, ny + 0.3, nz, ry, 2.2, 0.6, 0.9)); plant(rnd() < 0.3 ? 'feuillu-rond' : rnd() < 0.6 ? 'buisson-fleuri' : 'fougere', nx, ny + 0.6, nz, rnd() < 0.3 ? 0.32 : 0.8); } inst(mbox(1, 1, 1), M.terracotta, pots); });
    add(mbox(W + 8, 0.6, W + 8), M.terracotta, x, podium, z);
    for (let i = 0; i < 6; i++) for (const s of [1, -1]) { add(mbox(1.2, podium, 1.2), M.terracotta, x - h2 - 3 + i * ((W + 6) / 5), podium / 2, z + s * (h2 + 3)); add(mbox(1.2, podium, 1.2), M.terracotta, x + s * (h2 + 3), podium / 2, z - h2 - 3 + i * ((W + 6) / 5)); }
    add(mbox(W - 2, podium - 0.5, W - 2), M.glass, x, (podium - 0.5) / 2, z, { cast: false }).renderOrder = 2;
    add(mbox(W + 2.6, 0.8, W + 2.6), M.bed, x, H + 0.4, z);
    detail(() => { for (let k = 0; k < 8; k++) plant(k % 2 ? 'feuillu-eleve' : 'buisson-fleuri', x + rr(-11, 11), H + 0.8, z + rr(-11, 11), k % 2 ? 0.5 : 1); });
    const perg = []; for (let i = 0; i < 9; i++) perg.push(mat4(x - 10 + i * 2.5, H + 4.4, z - 4, 0, 0.25, 0.4, 12)); inst(mbox(1, 1, 1), M.glulam, perg);
    for (const [dx, dz] of [[-10, -10], [10, -10], [-10, 2], [10, 2]]) add(mbox(0.4, 3.8, 0.4), M.glulam, x + dx, H + 2.7, z + dz);
  });

  // 4. LES RACINES (≈125 m) — d'après Urban Forest (Koichi Takada, Brisbane)
  building('racines', ({ x, z }, detail) => {
    const A = 42, B = 28, base = 15, floors = 30, fh = 3.4;
    const se = (t, a, b, n = 5) => { const c = Math.cos(t), s = Math.sin(t); return [a * Math.sign(c) * Math.abs(c) ** (2 / n), b * Math.sign(s) * Math.abs(s) ** (2 / n)]; };
    const outline = (off, phase, amp) => { const pts = []; for (let i = 0; i < 128; i++) { const t = i / 128 * Math.PI * 2, [px, pz] = se(t, A / 2, B / 2), [qx, qz] = se(t + 0.01, A / 2, B / 2), tx = qx - px, tz = qz - pz, l = Math.hypot(tx, tz) || 1, d = off + amp * Math.sin(t * 5 + phase); pts.push(new THREE.Vector2(px + tz / l * d, pz - tx / l * d)); } return pts; };
    const slabGeo = (pts, depth) => new THREE.ExtrudeGeometry(new THREE.Shape(pts), { depth, bevelEnabled: false, curveSegments: 4 }).rotateX(Math.PI / 2);
    const trunkPts = []; for (let i = 0; i <= 14; i++) { const t = i / 14; trunkPts.push(new THREE.Vector2(1.1 + 1.1 * (1 - t) ** 3 + 1.4 * t ** 3, t * base)); }
    const trunk = new THREE.LatheGeometry(trunkPts, 18); { const u = trunk.attributes.uv, p = trunk.attributes.position; for (let i = 0; i < u.count; i++) u.setXY(i, u.getX(i) * 9, p.getY(i)); }
    const trunkM = [], branch = [];
    for (const [i, j] of [[-1, -0.5], [0, -0.5], [1, -0.5], [-1, 0.5], [0, 0.5], [1, 0.5]]) { const tx = x + i * 13, tz = z + j * 12; trunkM.push(mat4(tx, 0, tz, rnd() * 6)); for (let b = 0; b < 4; b++) { const a = b / 4 * 6.28 + 0.4; branch.push(beamMatrix(new THREE.Vector3(tx, base * 0.62, tz), new THREE.Vector3(tx + Math.cos(a) * 6, base, tz + Math.sin(a) * 5), 0.7, 0.7)); } }
    inst(trunk, M.trunkWood, trunkM); inst(new THREE.CylinderGeometry(0.5, 0.5, 1, 10), M.glulam, branch);
    add(slabGeo(outline(0.6, 0, 0), 1.2), M.concrete, x, base + 1.2, z);
    const core = add(new THREE.ExtrudeGeometry(new THREE.Shape(outline(-0.4, 0, 0)), { depth: floors * fh, bevelEnabled: false, curveSegments: 4 }).rotateX(-Math.PI / 2), M.glass, x, base + 1.2, z, { cast: false }); core.renderOrder = 2;
    add(mbox(8, floors * fh, 6), M.concrete, x, base + 1.2 + floors * fh / 2, z);
    const planters = [], drapes = [];
    for (let f = 0; f < floors; f++) {
      const y = base + 1.2 + (f + 1) * fh, pts = outline(1.9, f * 0.55, 1.4);
      add(slabGeo(pts, 0.38), M.white, x, y, z);
      for (let i = 0; i < pts.length; i += 6) { const p = pts[i], q = pts[(i + 1) % pts.length], ry = Math.atan2(q.x - p.x, q.y - p.y); planters.push(mat4(x + p.x * 0.97, y + 0.35, z + p.y * 0.97, ry, 0.7, 0.7, 2.6)); if (i % 12 === 0) detail(() => plant(rnd() < 0.18 ? 'feuillu-rond' : rnd() < 0.5 ? 'buisson' : 'buisson-fleuri', x + p.x * 0.97, y + 0.6, z + p.y * 0.97, rnd() < 0.18 ? 0.42 : 0.9)); if (i % 18 === 0) drapes.push(mat4(x + p.x * 0.985, y - 1.1, z + p.y * 0.985, ry + Math.PI / 2, 2.2, 2.2, 1)); }
    }
    inst(mbox(1, 1, 1), M.glulam, planters); inst(new THREE.PlaneGeometry(1, 1), M.hanging, drapes, false);
    const roofY = base + 1.2 + floors * fh + 0.4; add(slabGeo(outline(1.9, floors * 0.55, 1.4), 1), M.bed, x, roofY + 1, z); add(mbox(14, 0.6, 6), M.water, x + 6, roofY + 1.1, z);
    detail(() => { for (let k = 0; k < 12; k++) plant(k % 3 ? 'feuillu-eleve' : 'pin-touffu', x + rr(-18, 18), roofY + 1, z + rr(-10, 10), rr(0.45, 0.6)); });
    detail(() => { for (let k = 0; k < 18; k++) { const px = x + rr(-30, 30), pz = z + rr(-24, 24); if (Math.abs(px - x) < 22 && Math.abs(pz - z) < 13) plant(k % 2 ? 'fougere' : 'buisson', px, SLAB_TOP, pz, 1.2); else plant('feuillu-eleve', px, SLAB_TOP, pz, rr(0.8, 1)); } });
  });

  // 5. L'OASIS (280 m) — d'après CapitaSpring (BIG + Carlo Ratti, Singapour)
  building('oasis', ({ x, z, h: H }, detail) => {
    const W = 32, h2 = W / 2, cityRoom = 18, oases = [[96, 132], [196, 214]];
    for (const [a, b] of [[cityRoom, oases[0][0]], [oases[0][1], oases[1][0]], [oases[1][1], H - 12]]) add(mbox(W - 2.4, b - a, W - 2.4), M.curtainLit, x, (a + b) / 2, z);
    add(mbox(12, H, 12), M.concrete, x, H / 2, z);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if (i % 3 === 0 || j % 3 === 0) add(mcyl(0.8, 0.8, cityRoom, 16), M.white, x - 12 + i * 8, cityRoom / 2, z - 12 + j * 8);
    detail(() => { for (let k = 0; k < 14; k++) plant(k % 2 ? 'feuillu-rond' : 'fougere', x + rr(-12, 12), SLAB_TOP, z + rr(-12, 12), k % 2 ? 0.9 : 1.3); });
    for (const [a, b] of oases) {
      for (let y = a; y < b; y += 9) { add(mbox(W - 1, 0.6, W - 1), M.bed, x, y + 0.3, z); detail(() => { for (let k = 0; k < 10; k++) { const px = x + rr(-13, 13), pz = z + rr(-13, 13); if (Math.abs(px - x) < 7 && Math.abs(pz - z) < 7) continue; plant(k % 4 === 0 ? 'pin-touffu' : k % 2 ? 'feuillu-rond' : 'buisson-fleuri', px, y + 0.6, pz, k % 2 ? rr(0.45, 0.65) : 1); } }); }
      for (const [cx, cz] of [[-10, -10], [10, -10], [-10, 10], [10, 10]]) add(mcyl(0.9, 0.9, b - a, 16), M.white, x + cx, (a + b) / 2, z + cz);
      const ramp = []; for (let t = 0; t < 1; t += 0.01) { const th = t * Math.PI * 3; ramp.push(mat4(x + Math.cos(th) * 11.5, a + 0.6 + t * (b - a - 2), z + Math.sin(th) * 11.5, -th, 1.6, 0.25, 2.4)); } inst(mbox(1, 1, 1), M.deck, ramp);
    }
    const finsA = [], finsB = [], nPerFace = 20, step = 4;
    const bulge = (y, k) => { let d = 0; for (const [a, b] of oases) if (y > a - 14 && y < b + 14) { const t = (y - (a - 14)) / (b - a + 28); d = Math.max(d, Math.sin(Math.PI * t) ** 1.6 * (3.5 + 3.5 * Math.abs(Math.sin(k * 0.9)))); } return d; };
    const faceDefs = [(s, o) => [x + s, z + h2 + o], (s, o) => [x - s, z - h2 - o], (s, o) => [x + h2 + o, z - s], (s, o) => [x - h2 - o, z + s]];
    for (const P of faceDefs) for (let k = 0; k < nPerFace; k++) { const s = -h2 + (k + 0.5) * W / nPerFace; for (let y = cityRoom; y < H - 6; y += step) { const [ax, az] = P(s, 0.6 + bulge(y, k)), [bx, bz] = P(s, 0.6 + bulge(y + step, k)); (k % 4 === 0 ? finsB : finsA).push(beamMatrix(new THREE.Vector3(ax, y, az), new THREE.Vector3(bx, y + step, bz), 0.32, 0.9)); } }
    inst(UNIT, M.fin, finsA); inst(UNIT, M.pv, finsB);
    add(mbox(W, 0.8, W), M.bed, x, H - 11.6, z); detail(() => { for (let k = 0; k < 10; k++) plant(k % 2 ? 'feuillu-eleve' : 'buisson-fleuri', x + rr(-13, 13), H - 11.2, z + rr(-13, 13), k % 2 ? 0.55 : 1); });
    add(mbox(W - 6, 5, W - 6), M.glass, x, H - 8.6, z, { cast: false }).renderOrder = 2; add(mbox(W - 4, 0.6, W - 4), M.white, x, H - 5.8, z);
  });

  // 6. LA CANOPÉE (18 m) — d'après Google Bay View (BIG + Heatherwick)
  building('canopee', ({ x, z }, detail) => {
    const L = 120, D = 64, hw = L / 2, hd = D / 2, peaks = [[-38, 0], [0, 0], [38, 0]];
    const roofH = (u, v) => { let h = 0; for (const [px, pz] of peaks) h = Math.max(h, Math.exp(-(((u - px) / 22) ** 2 + ((v - pz) / 24) ** 2) * 1.5)); const e = Math.max(0, Math.min(1, (hw + 3 - Math.abs(u)) / 12, (hd + 3 - Math.abs(v)) / 12)); return 5.2 + 12.6 * h + 1.6 * e; };
    const g = new THREE.PlaneGeometry(L + 6, D + 6, 110, 60).rotateX(-Math.PI / 2), p = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) { const u = p.getX(i), v = p.getZ(i); p.setY(i, roofH(u, v)); uv.setXY(i, u, v); }
    g.computeVertexNormals(); add(g, M.scales, x, 0, z);
    add(g.clone(), pbr('contreplaque', 3, { side: THREE.BackSide, color: '#f3dfc0', emissive: '#7a5a38', emissiveIntensity: 0.5 }), x, -0.25, z, { cast: false });
    for (const [px, pz] of peaks) { const h = roofH(px, pz); add(mcyl(5, 5.6, 2.2, 32, true), M.glass, x + px, h + 0.6, z + pz, { cast: false }).renderOrder = 2; add(mcyl(6.2, 6.2, 0.35, 32), M.scales, x + px, h + 1.9, z + pz); }
    const perim = [], edge = (a, b, n) => { for (let k = 0; k < n; k++) { const t0 = k / n, t1 = (k + 1) / n, u0 = a[0] + (b[0] - a[0]) * t0, v0 = a[1] + (b[1] - a[1]) * t0, u1 = a[0] + (b[0] - a[0]) * t1, v1 = a[1] + (b[1] - a[1]) * t1; perim.push([[x + u0, 0, z + v0], [x + u1, 0, z + v1], [x + u1, roofH(u1, v1) - 0.3, z + v1], [x + u0, roofH(u0, v0) - 0.3, z + v0]]); } };
    edge([-hw, hd], [hw, hd], 60); edge([hw, hd], [hw, -hd], 30); edge([hw, -hd], [-hw, -hd], 60); edge([-hw, -hd], [-hw, hd], 30);
    const gw = quadMesh(perim, M.glass); gw.castShadow = false; gw.renderOrder = 2;
    const mul = perim.filter((_, i) => i % 2 === 0).map(([a]) => { const h = roofH(a[0] - x, a[2] - z); return mat4(a[0], h / 2, a[2], 0, 0.14, h, 0.14); }); inst(UNIT, M.white, mul);
    add(mbox(L, 0.2, D), M.polished, x, SLAB_TOP + 0.1, z, { cast: false });
    const cols = []; for (let i = -4; i <= 4; i++) for (let j = -2; j <= 2; j++) { const u = i * 12.5, v = j * 12; if (peaks.some(([px, pz]) => Math.hypot(u - px, v - pz) < 7)) continue; cols.push(mat4(x + u, roofH(u, v) / 2, z + v, 0, 0.32, roofH(u, v), 0.32)); }
    inst(new THREE.CylinderGeometry(0.5, 0.5, 1, 10), M.white, cols);
    for (const s of [1, -1]) { add(mbox(L - 8, 0.35, 9), M.clt, x, 5, z + s * (hd - 5)); add(mbox(L - 8, 1.05, 0.05), M.glassRail, x, 5.7, z + s * (hd - 9.5), { cast: false }).renderOrder = 2; }
    for (let k = 0; k < 8; k++) { const u = -48 + k * 13.5, v = (k % 2 ? 1 : -1) * 6; add(mbox(7, 3.2, 5), M.glulam, x + u, 1.8, z + v); add(mbox(7.4, 0.35, 5.4), M.bed, x + u, 3.55, z + v); }
    detail(() => {
      for (const [px, pz] of peaks) { plant('feuillu-rond', x + px, 0.3, z + pz, 0.95); add(mcyl(4, 4, 0.45, 20), M.bed, x + px, 0.3, z + pz); }
      for (let k = 0; k < 8; k++) plant(k % 2 ? 'buisson-fleuri' : 'fougere', x - 48 + k * 13.5, 3.7, z + (k % 2 ? 1 : -1) * 6, 1);
      for (let k = 0; k < 90; k++) { const side = k % 4, t = rr(-1, 1), px = side < 2 ? x + t * (hw + 6) : x + (side === 2 ? 1 : -1) * (hw + 8), pz = side < 2 ? z + (side ? 1 : -1) * (hd + 8) : z + t * (hd + 6); plant(k % 3 ? 'buisson' : 'fougere', px + rr(-2, 2), SLAB_TOP, pz + rr(-2, 2), rr(0.9, 1.4)); }
    });
    add(mbox(40, 0.4, 8), M.water, x + 20, SLAB_TOP + 0.05, z - hd - 14, { cast: false });
  });

  // 7. LE PHARE (400 m) — d'après W350 (Tokyo) et Pertamina Energy Tower (SOM)
  building('phare', ({ x, z, h: H }, detail) => {
    const r0 = 34, r1 = 14, crown = 352, rad = y => r0 + (r1 - r0) * Math.min(1, y / crown) ** 1.25;
    const prof = []; for (let i = 0; i <= 40; i++) { const y = i / 40 * crown; prof.push(new THREE.Vector2(rad(y), y)); }
    add(new THREE.LatheGeometry(prof, 64), M.curtainLit, x, 0, z);
    const lat = [], nL = 26, seg = 8;
    for (const dir of [1, -1]) for (let k = 0; k < nL; k++) for (let y = 0; y < crown; y += seg) { const t0 = k / nL * 6.283 + dir * y / crown * 2.4, t1 = k / nL * 6.283 + dir * (y + seg) / crown * 2.4, ra = rad(y) + 0.7, rb = rad(y + seg) + 0.7; lat.push(beamMatrix(new THREE.Vector3(x + Math.cos(t0) * ra, y, z + Math.sin(t0) * ra), new THREE.Vector3(x + Math.cos(t1) * rb, y + seg, z + Math.sin(t1) * rb), 0.9, 0.9)); }
    inst(UNIT, M.latticeWood, lat);
    for (let y = 30; y < crown - 10; y += 30) {
      const r = rad(y) + 0.7;
      add(new THREE.LatheGeometry([new THREE.Vector2(r - 0.5, -0.8), new THREE.Vector2(r + 6, -0.8), new THREE.Vector2(r + 6, 0.6), new THREE.Vector2(r - 0.5, 0.6)], 64), M.white, x, y, z);
      add(new THREE.RingGeometry(r, r + 5.7, 64, 1).rotateX(-Math.PI / 2), M.bed, x, y + 0.62, z, { cast: false });
      add(mcyl(r + 6, r + 6, 1.2, 64, true), M.glassRail, x, y + 1.2, z, { cast: false }).renderOrder = 2;
      detail(() => { const n = Math.floor(2 * Math.PI * (r + 3) / 6); for (let k = 0; k < n; k++) { const a = k / n * 6.283 + y; plant(k % 3 === 0 ? 'feuillu-rond' : k % 3 === 1 ? 'buisson-fleuri' : 'fougere', x + Math.cos(a) * (r + 3.2), y + 0.6, z + Math.sin(a) * (r + 3.2), k % 3 === 0 ? rr(0.4, 0.55) : 1); } });
    }
    // Couronne : deux pétales qui laissent passer le vent, éoliennes verticales dans l'entonnoir.
    for (const start of [1.35, 1.35 + Math.PI]) { const pet = []; for (let i = 0; i <= 12; i++) { const t = i / 12; pet.push(new THREE.Vector2(r1 * (1 - 0.55 * t ** 2) + 0.7, crown + t * 44)); } add(new THREE.LatheGeometry(pet, 20, start, Math.PI - 1.5), M.curtain, x, 0, z); }
    add(mcyl(r1 + 1.5, r1 + 1.5, 1, 40), M.white, x, crown, z); add(mcyl(r1 * 0.5, r1 * 0.5, 1, 40), M.bed, x, crown + 44, z);
    for (const dd of [-7, 0, 7]) for (const yb of [crown + 3, crown + 20]) { const ax = Math.cos(0.6) * dd, az = -Math.sin(0.6) * dd; add(new THREE.CylinderGeometry(0.25, 0.25, 15, 8), M.steel, x + ax, yb + 7.5, z + az); for (let b = 0; b < 3; b++) { const bl = add(new THREE.BoxGeometry(0.15, 12, 1.4), M.white, x + ax + Math.cos(b * 2.09) * 2.2, yb + 7.5, z + az + Math.sin(b * 2.09) * 2.2); bl.rotation.set(0, -b * 2.09, 0.3); } }
    add(new THREE.CylinderGeometry(0.3, 1.2, 14, 12), M.steel, x, crown + 51, z); add(new THREE.SphereGeometry(1.1, 16, 12), M.beacon, x, crown + 58.5, z, { cast: false });
    add(new THREE.RingGeometry(r0 + 2, r0 + 22, 64).rotateX(-Math.PI / 2), M.bed, x, SLAB_TOP + 0.03, z, { cast: false });
    detail(() => { for (let k = 0; k < 36; k++) { const a = k / 36 * 6.28, r = r0 + rr(6, 20); plant(k % 3 ? 'feuillu-eleve' : 'buisson-fleuri', x + Math.cos(a) * r, SLAB_TOP, z + Math.sin(a) * r, k % 3 ? rr(0.8, 1) : 1.2); } });
    add(new THREE.LatheGeometry([new THREE.Vector2(r0, 9), new THREE.Vector2(r0 + 12, 7.5), new THREE.Vector2(r0 + 12, 7.9), new THREE.Vector2(r0, 9.4)], 64), M.glulam, x, 0, z);
    void H;
  });

  // Passerelle bois entre la Spirale et la Ruche, au-dessus de la rue.
  { const s = buildings.spirale, r = buildings.ruche, a = new THREE.Vector3(s.x + s.Rg + 7, 52, s.z - 4), b = new THREE.Vector3(r.x - r.W / 2, 52, r.z + 6); const m = new THREE.Mesh(UNIT, M.glulam); m.applyMatrix4(beamMatrix(a, b, 4, 0.6)); m.castShadow = true; root.add(m); const g = new THREE.Mesh(UNIT, M.glassRail); g.applyMatrix4(beamMatrix(a.clone().setY(53.4), b.clone().setY(53.4), 4.2, 2.2)); g.renderOrder = 2; root.add(g); }

  // ---------- dalle béton, rues, rond-point, mobilier ----------
  const streets = new THREE.Group(); streets.name = 'Rues du quartier'; root.add(streets); target = streets;
  const streetFine = new THREE.Group(); streetFine.name = 'Rues — détails'; streets.add(streetFine);
  {
    const { minX, maxX, minZ, maxZ } = SOLAR_BOX, w = maxX - minX, d = maxZ - minZ;
    add(mbox(w, 0.4, d), M.slab, (minX + maxX) / 2, SLAB_TOP - 0.2, (minZ + maxZ) / 2, { cast: false });
    const j = []; for (let xx = minX + 9; xx < maxX; xx += 9) j.push(mat4(xx, SLAB_TOP + 0.005, (minZ + maxZ) / 2, 0, 0.025, 0.01, d)); for (let zz = minZ + 9; zz < maxZ; zz += 9) j.push(mat4((minX + maxX) / 2, SLAB_TOP + 0.005, zz, 0, w, 0.01, 0.025));
    inst(UNIT, M.joint, j, false);
  }
  const RW = STREET.width, SW = STREET.sidewalk, RB = ROUNDABOUT, Y = SLAB_TOP;
  const freeSpans = r => { const along = r.ns ? 1 : 0, fixed = r.ns ? 0 : 1, lo = Math.min(r.a[along], r.b[along]), hi = Math.max(r.a[along], r.b[along]); const cuts = CROSSINGS.filter(c => Math.abs(c[fixed] - r.a[fixed]) < 0.1).map(c => c[along]).filter(v => v >= lo - 1 && v <= hi + 1).sort((p, q) => p - q); const spans = []; let s = lo; for (const c of cuts) { if (c - (RW / 2 + SW) > s) spans.push([s, c - (RW / 2 + SW)]); s = Math.max(s, c + RW / 2 + SW); } if (hi > s) spans.push([s, hi]); return spans; };
  const lamps = [], marks = [], curbs = [], treePits = [], streetTrees = [];
  for (const r of STREETS) {
    const [ax, az] = r.a, [bx, bz] = r.b, len = Math.hypot(bx - ax, bz - az), cx = (ax + bx) / 2, cz = (az + bz) / 2, ext = r.spur ? 0 : RW / 2;
    add(r.ns ? mbox(RW, 0.08, len + 2 * ext) : mbox(len + 2 * ext, 0.08, RW), M.asphalt, cx, Y + (r.ns ? 0.02 : 0.025), cz, { cast: false });
    for (const [s0, s1] of freeSpans(r)) {
      const L = s1 - s0, m = (s0 + s1) / 2;
      for (const side of [-1, 1]) {
        const off = side * (RW / 2 + SW / 2), coff = side * (RW / 2 + 0.12);
        r.ns ? add(mbox(SW, 0.18, L), M.sidewalk, ax + off, Y + 0.07, m, { cast: false }) : add(mbox(L, 0.18, SW), M.sidewalk, m, Y + 0.07, az + off, { cast: false });
        curbs.push(r.ns ? mat4(ax + coff, Y + 0.08, m, 0, 0.24, 0.22, L) : mat4(m, Y + 0.08, az + coff, 0, L, 0.22, 0.24));
        marks.push(r.ns ? mat4(ax + side * (RW / 2 - 0.5), Y + 0.07, m, 0, 0.14, 0.01, Math.max(0, L - 8)) : mat4(m, Y + 0.07, az + side * (RW / 2 - 0.5), 0, Math.max(0, L - 8), 0.01, 0.14));
        for (let t = s0 + 12; t < s1 - 8; t += 30) lamps.push(r.ns ? [ax + side * (RW / 2 + SW - 0.4), t, side > 0 ? -Math.PI / 2 : Math.PI / 2] : [t, az + side * (RW / 2 + SW - 0.4), side > 0 ? Math.PI : 0]);
        for (let t = s0 + 27; t < s1 - 8; t += 30) { const tx = r.ns ? ax + side * (RW / 2 + SW + 1.2) : t, tz = r.ns ? t : az + side * (RW / 2 + SW + 1.2); streetTrees.push([tx, tz]); treePits.push(mat4(tx, Y + 0.07, tz, 0, 2.2, 0.2, 2.2)); }
      }
      for (let t = s0 + 6; t < s1 - 6; t += 8) marks.push(r.ns ? mat4(ax, Y + 0.07, t, 0, 0.15, 0.01, 3) : mat4(t, Y + 0.07, az, 0, 3, 0.01, 0.15));
      for (const t of [s0 + 2.2, s1 - 2.2]) for (let k = -4; k <= 4; k++) marks.push(r.ns ? mat4(ax + k * 1.05, Y + 0.07, t, 0, 0.55, 0.01, 3.2) : mat4(t, Y + 0.07, az + k * 1.05, 0, 3.2, 0.01, 0.55));
    }
  }
  { const ring = (r0, r1, y, mat) => { const g = new THREE.RingGeometry(r0, r1, 112, 1).rotateX(-Math.PI / 2), uv = g.attributes.uv, p = g.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i), p.getZ(i)); return add(g, mat, RB.x, y, RB.z, { cast: false }); };
    ring(RB.r - RW / 2, RB.r + RW / 2, Y + 0.02, M.asphalt); ring(RB.r - RW / 2 - SW, RB.r - RW / 2, Y + 0.16, M.sidewalk); ring(RB.r + RW / 2, RB.r + RW / 2 + SW, Y + 0.16, M.sidewalk);
    for (let k = 0; k < 52; k++) { const a = k / 52 * Math.PI * 2; marks.push(mat4(RB.x + Math.cos(a) * RB.r, Y + 0.07, RB.z + Math.sin(a) * RB.r, -a, 0.15, 0.01, 3)); }
    for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2 + 0.2; lamps.push([RB.x + Math.cos(a) * (RB.r + RW / 2 + SW - 0.4), RB.z + Math.sin(a) * (RB.r + RW / 2 + SW - 0.4), -a - Math.PI / 2]); } }
  inst(UNIT, M.curb, curbs, false); inst(UNIT, M.paint, marks, false); inst(UNIT, M.curb, treePits, false);
  { const pole = new THREE.CylinderGeometry(0.08, 0.12, 8, 8).translate(0, 4, 0), arm = new THREE.BoxGeometry(0.1, 0.1, 2.2).translate(0, 7.9, 1.0), head = new THREE.BoxGeometry(0.35, 0.14, 0.8).translate(0, 7.8, 2.0), pv = new THREE.BoxGeometry(1.4, 0.05, 0.9).rotateX(-0.45).translate(0, 8.4, -0.2);
    disposables.push(pole, arm, head, pv);
    const ms = lamps.map(([lx, lz, ry]) => mat4(lx, Y + 0.16, lz, ry)); inst(pole, M.bronze, ms); inst(arm, M.bronze, ms); inst(head, M.lamp, ms, false); inst(pv, M.pv, ms); }
  // Arbres d'alignement : modèle CC0 du jeu (feuillu élevé) si disponible, sinon arbre léger.
  try {
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder), gltf = await loader.loadAsync(new URL('../library/models/vegetation/feuillu-eleve.lod0.glb', import.meta.url).href);
    gltf.scene.updateMatrixWorld(true);
    const toFloat = geo => { for (const [n, a] of Object.entries(geo.attributes)) { if (a.array instanceof Float32Array && !a.normalized) continue; const o = new Float32Array(a.count * a.itemSize), get = [a.getX, a.getY, a.getZ, a.getW]; for (let i = 0; i < a.count; i++) for (let k = 0; k < a.itemSize; k++) o[i * a.itemSize + k] = get[k].call(a, i); geo.setAttribute(n, new THREE.BufferAttribute(o, a.itemSize)); } return geo; };
    const ms = streetTrees.map(([tx, tz]) => mat4(tx, Y, tz, rnd() * 6.28, 0.7, 0.7, 0.7));
    target = streetFine; gltf.scene.traverse(o => { if (o.isMesh) { const g = toFloat(o.geometry.clone()).applyMatrix4(o.matrixWorld); disposables.push(g); inst(g, o.material, ms); } });
  } catch { target = streetFine; for (const [tx, tz] of streetTrees) plant('feuillu-eleve', tx, Y, tz, 1.1); flushPlants(); }
  target = root;

  // ---------- interface ----------
  const night = [M.light, M.curtainLit, M.beacon, M.lamp];
  let lastX = Infinity, lastZ = Infinity;
  return {
    root, buildings: BUILDINGS,
    statistics: { batiments: BUILDINGS.length, rues: STREETS.length, lampadaires: lamps.length, arbresAlignement: streetTrees.length },
    // Détails visibles seulement à moins de FINE_DISTANCE du bâtiment (recalcul tous les 10 m).
    update(position) {
      if ((position.x - lastX) ** 2 + (position.z - lastZ) ** 2 < 100) return;
      lastX = position.x; lastZ = position.z;
      for (const b of buildings) b.fine.visible = Math.hypot(position.x - b.def.x, position.z - b.def.z) < FINE_DISTANCE;
      const cx = Math.max(SOLAR_BOX.minX, Math.min(SOLAR_BOX.maxX, position.x)), cz = Math.max(SOLAR_BOX.minZ, Math.min(SOLAR_BOX.maxZ, position.z));
      streetFine.visible = Math.hypot(position.x - cx, position.z - cz) < FINE_DISTANCE;
    },
    setNight(on) { M.light.emissiveIntensity = on ? 2.2 : 0; M.curtainLit.emissiveIntensity = on ? 0.25 : 0; M.beacon.emissiveIntensity = on ? 6 : 1.5; M.lamp.emissiveIntensity = on ? 3 : 0.2; void night; },
    dispose() { root.removeFromParent(); root.traverse(o => { if (o.isInstancedMesh) o.dispose(); if (o.geometry && o.geometry !== UNIT) o.geometry.dispose(); }); for (const d of disposables) d.dispose?.(); },
  };
}
