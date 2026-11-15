// Quartier vivant autour des tours solarpunk (plan « dalle serrée ») : immeubles mitoyens avec commerces
// en rez-de-chaussée, boulevard de tramway, place des Fontaines, abribus, terrasses, passants et La Flèche (700 m).
// Façades : textures Poly Haven (CC0, voir ftex/sources.json) sur lesquelles le jeu dessine fenêtres et vitrines.
// Géométries fusionnées par matériau ; mobilier, passants et voitures visibles seulement de près.
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { SLAB_TOP, TRAM, FLECHE, STREETS, BUILDINGS, SOLAR_BOX } from './layout.js';
import { buildPlan, SQUARE, GF, FL, BAY, keepHit } from './quartier-plan.js';

const FINE_DISTANCE = 260; // m : passants, voitures, mobilier, grands arbres détaillés

export async function createQuartier({ THREE, scene }) {
  const root = new THREE.Group(); root.name = 'Quartier vivant'; scene.add(root);
  const fine = new THREE.Group(); fine.name = 'Quartier vivant — détails'; root.add(fine);
  const far = new THREE.Group(); far.name = 'Quartier vivant — arbres simplifiés (loin)'; root.add(far); far.visible = false;
  let seed = 9091; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647, rr = (a, b) => a + rnd() * (b - a), pick = a => a[Math.floor(rnd() * a.length)];
  const Y = SLAB_TOP, disposables = [];
  const here = new URL('./', import.meta.url).href;

  // ---------- utilitaires ----------
  const tl = new THREE.TextureLoader(), texCache = {};
  const tex = (file, size, color = true) => { const k = file + size; if (!texCache[k]) { const t = tl.load(here + file); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; t.repeat.set(1 / size, 1 / size); if (color) t.colorSpace = THREE.SRGBColorSpace; texCache[k] = t; disposables.push(t); } return texCache[k]; };
  const keep = m => { disposables.push(m); return m; };
  const pbr = (name, size, o = {}) => keep(new THREE.MeshStandardMaterial({ map: tex(`tex/${name}-couleur.webp`, size), normalMap: tex(`tex/${name}-normale.webp`, size, false), roughness: 0.88, ...o }));
  const std = o => keep(new THREE.MeshStandardMaterial(o));
  const loadImg = src => new Promise((ok, ko) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => ok(i); i.onerror = ko; i.src = src; });
  const mbox = (w, h, d) => { const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv; for (let f = 0; f < 6; f++) { const sx = f < 2 ? d : w, sy = f === 2 || f === 3 ? d : h; for (let i = 0; i < 4; i++) { const k = f * 4 + i; uv.setXY(k, uv.getX(k) * sx, uv.getY(k) * sy); } } return g; };
  const mat4 = (x, y, z, ry = 0, sx = 1, sy = 1, sz = 1, rx = 0, rz = 0) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')), new THREE.Vector3(sx, sy, sz));
  const beamMatrix = (a, b, w, d) => { const v = new THREE.Vector3().subVectors(b, a), len = v.length(), mid = a.clone().add(b).multiplyScalar(0.5); return new THREE.Matrix4().compose(mid, new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize()), new THREE.Vector3(w, len, d)); };
  let target = root;
  const add = (geo, mat, x = 0, y = 0, z = 0, o = {}) => { disposables.push(geo); const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = o.cast ?? true; m.receiveShadow = true; target.add(m); return m; };
  const inst = (geo, mat, mats, cast = true, colors) => { if (!mats.length) return null; const m = new THREE.InstancedMesh(geo, mat, mats.length); mats.forEach((x, i) => m.setMatrixAt(i, x)); if (colors) colors.forEach((c, i) => m.setColorAt(i, new THREE.Color(c))); m.castShadow = cast; m.receiveShadow = true; m.computeBoundingSphere(); target.add(m); return m; };
  const UNIT = new THREE.BoxGeometry(1, 1, 1); disposables.push(UNIT);
  // Géométries fusionnées par matériau (un appel de dessin par matériau et par groupe).
  const buckets = new Map();
  const put = (mat, geo, x, y, z, ry = 0) => { if (ry) geo.rotateY(ry); geo.translate(x, y, z); const key = target === fine ? 'f' : 'r'; if (!buckets.has(key)) buckets.set(key, new Map()); const b = buckets.get(key); if (!b.has(mat)) b.set(mat, []); b.get(mat).push(geo.index ? geo.toNonIndexed() : geo); };
  const flush = () => { for (const [key, map] of buckets) { const parent = key === 'f' ? fine : root; for (const [mat, list] of map) for (let i = 0; i < list.length; i += 3000) { const g = mergeGeometries(list.slice(i, i + 3000), false); disposables.push(g); const m = new THREE.Mesh(g, mat); m.castShadow = !mat.userData.noShadow; m.receiveShadow = true; parent.add(m); } } buckets.clear(); };

  // ---------- végétation CC0 du jeu ----------
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const toFloat = geo => { for (const [n, a] of Object.entries(geo.attributes)) { if (a.array instanceof Float32Array && !a.normalized) continue; const o = new Float32Array(a.count * a.itemSize), get = [a.getX, a.getY, a.getZ, a.getW]; for (let i = 0; i < a.count; i++) for (let k = 0; k < a.itemSize; k++) o[i * a.itemSize + k] = get[k].call(a, i); geo.setAttribute(n, new THREE.BufferAttribute(o, a.itemSize)); } return geo; };
  const veg = {};
  await Promise.all(['feuillu-eleve'].map(async id => { try { const g = await loader.loadAsync(new URL(`../library/models/vegetation/${id}.lod0.glb`, import.meta.url).href); g.scene.updateMatrixWorld(true); const parts = []; g.scene.traverse(o => { if (o.isMesh) { const geo = toFloat(o.geometry.clone()).applyMatrix4(o.matrixWorld); disposables.push(geo); parts.push({ geo, mat: o.material }); } }); veg[id] = parts; } catch { veg[id] = []; } }));
  // Végétation légère (couleurs de sommets, ~80 à 260 triangles) ; le grand feuillu détaillé (modèle CC0 du jeu)
  // n'est affiché que de près, remplacé au loin par sa version légère.
  const colorize = (geo, hex, jitter = 0.06) => { geo = geo.index ? geo.toNonIndexed() : geo; const c = new THREE.Color(hex), n = geo.attributes.position.count, col = new Float32Array(n * 3); for (let i = 0; i < n; i += 3) { const k = 1 + (rnd() - 0.5) * jitter * 2; for (let j = 0; j < 3; j++) { col[(i + j) * 3] = c.r * k; col[(i + j) * 3 + 1] = c.g * k; col[(i + j) * 3 + 2] = c.b * k; } } geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.deleteAttribute('uv'); return geo; };
  const mergeColored = parts => { const g = mergeGeometries(parts.map(p => { p.computeVertexNormals(); return p; }), false); for (const p of parts) p.dispose(); disposables.push(g); return g; };
  const ico = (r, x, y, z, sy = 1) => new THREE.IcosahedronGeometry(r, 1).scale(1, sy, 1).translate(x, y, z);
  const LIGHT = {
    tree: mergeColored([colorize(new THREE.CylinderGeometry(0.13, 0.22, 2.4, 6).translate(0, 1.2, 0), '#6b4a32'), colorize(ico(1.45, 0, 3.1, 0, 0.9), '#4f8a3a'), colorize(ico(1.0, 0.75, 3.75, 0.35), '#5f9c43'), colorize(ico(0.95, -0.7, 3.5, -0.45), '#447c35')]),
    bush: mergeColored([colorize(ico(0.65, 0, 0.45, 0, 0.7), '#4f8a3a'), colorize(ico(0.45, 0.4, 0.55, 0.15, 0.8), '#5e9a42')]),
    flower: mergeColored([colorize(ico(0.6, 0, 0.42, 0, 0.7), '#4a8236'), ...[[0.3, 0.75, 0.2, '#e78fb3'], [-0.25, 0.7, -0.2, '#f2d35b'], [0.05, 0.8, -0.3, '#c58ae0'], [-0.35, 0.6, 0.25, '#e78fb3']].map(([x, y, z, c]) => colorize(new THREE.IcosahedronGeometry(0.13, 0).translate(x, y, z), c))]),
  };
  const plantMat = std({ vertexColors: true, roughness: 0.9, flatShading: true });
  const LIGHT_OF = { 'feuillu-eleve': ['tree', 1.7], 'feuillu-rond': ['tree', 1.4], 'arbre-feuillu': ['tree', 1.5], buisson: ['bush', 1.1], 'buisson-fleuri': ['flower', 1.1] };
  const lightPlants = { root: {}, far: {} }, glbPlants = {};
  const plant = (id, x, y, z, s = 1) => { const ry = rnd() * 6.28, [kind, k] = LIGHT_OF[id]; if (id === 'feuillu-eleve' && veg[id]?.length) { (glbPlants[id] ||= []).push(mat4(x, y, z, ry, s, s, s)); (lightPlants.far[kind] ||= []).push(mat4(x, y, z, ry, s * k, s * k, s * k)); } else (lightPlants.root[kind] ||= []).push(mat4(x, y, z, ry, s * k, s * k, s * k)); };
  const people = [], cars = [];
  const person = (x, z, y = Y) => people.push([x, y, z]);

  // ---------- matériaux ----------
  const M = {
    lawn: pbr('pelouse', 4, { color: '#a7cf86' }), paving: pbr('dalle', 3, { color: '#efece6' }), sidewalk: pbr('trottoir', 2.2, { color: '#e6e0d6' }),
    asphalt: pbr('asphalte', 5, { color: '#8a8a88', roughness: 0.95 }), concrete: pbr('beton', 4), deck: pbr('bois-terrasse', 2.2), glulam: pbr('lamelle', 3),
    stone: keep(new THREE.MeshStandardMaterial({ map: tex('ftex/stone_brick_wall_001.webp', 2.5), color: '#d9cfbd', roughness: 0.9 })),
    cobble: keep(new THREE.MeshStandardMaterial({ map: tex('ftex/cobblestone_floor_001.webp', 2.4), color: '#d8d2c8', roughness: 0.95 })),
    zinc: std({ color: '#6c7479', metalness: 0.55, roughness: 0.45 }), slate: std({ color: '#4e565c', roughness: 0.7 }),
    cornice: std({ color: '#ece6da', roughness: 0.7 }), white: std({ color: '#f4f3ef', roughness: 0.5 }), dark: std({ color: '#2b3035', roughness: 0.6, metalness: 0.4 }),
    steel: std({ color: '#d9dcdc', metalness: 0.6, roughness: 0.35 }), bronze: std({ color: '#9a7650', metalness: 0.92, roughness: 0.28 }),
    rail: std({ color: '#b9bcbe', metalness: 0.9, roughness: 0.25 }), green: std({ color: '#2f7a55', roughness: 0.6 }), curb: std({ color: '#cfccc5', roughness: 0.7 }),
    glass: keep(new THREE.MeshPhysicalMaterial({ color: '#dff3ff', roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide })),
    water: keep(new THREE.MeshPhysicalMaterial({ color: '#2a5f66', roughness: 0.22, metalness: 0, clearcoat: 0.5, envMapIntensity: 0.45 })),
    jet: std({ color: '#f4fbff', emissive: '#cfefff', emissiveIntensity: 0.25, transparent: true, opacity: 0.32, depthWrite: false }),
    pv: std({ color: '#1d2b44', metalness: 0.6, roughness: 0.2 }), bush: std({ color: '#5b8f43', roughness: 0.9, flatShading: true }),
    tint: std({ color: '#ffffff', roughness: 0.6 }), ad: std({ color: '#ffffff', emissive: '#e8f3ff', emissiveIntensity: 0.6 }), lampHead: std({ color: '#fff', emissive: '#ffe2a8', emissiveIntensity: 0.3 }),
  };
  for (const k of ['water', 'jet', 'glass']) M[k].userData.noShadow = true;

  // ---------- façades : texture CC0 + fenêtres dessinées ----------
  // Tuile = 4 travées de 3,2 m × 3 étages de 3,1 m, 64 px par mètre.
  const PX = 64, TW = 4 * BAY, TH = 3 * FL;
  const imgs = {}, DIMS = { beige_wall_001: 3, white_plaster_02: 1, red_brick_03: 1, brick_wall_006: 3, raw_plank_wall: 1.87, painted_plaster_wall: 2, red_plaster_weathered: 2 };
  await Promise.all(Object.keys(DIMS).map(async n => { try { imgs[n] = await loadImg(`${here}ftex/${n}.webp`); } catch { imgs[n] = null; } }));
  const canvasTex = (c, rw, rh) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / rw, 1 / rh); t.anisotropy = 8; disposables.push(t); return t; };
  const glassFill = (g, x, y, w, h) => { const gr = g.createLinearGradient(x, y, x + w * 0.3, y + h); gr.addColorStop(0, '#a9bfcd'); gr.addColorStop(0.45, '#5d7584'); gr.addColorStop(1, '#25333d'); g.fillStyle = gr; g.fillRect(x, y, w, h); const r = rnd(); if (r < 0.35) { g.fillStyle = 'rgba(236,226,206,.85)'; const cw = w * rr(0.18, 0.32); g.fillRect(x, y, cw, h); g.fillRect(x + w - cw, y, cw, h); } else if (r < 0.55) { g.fillStyle = 'rgba(225,222,214,.9)'; g.fillRect(x, y, w, h * rr(0.25, 0.6)); } };
  function facade(spec) {
    const c = document.createElement('canvas'); c.width = Math.round(TW * PX); c.height = Math.round(TH * PX); const g = c.getContext('2d');
    const im = imgs[spec.img], s = (DIMS[spec.img] || 1) * PX;
    g.fillStyle = spec.base || '#d9d2c4'; g.fillRect(0, 0, c.width, c.height);
    if (im) { g.save(); if (spec.rot) { g.translate(c.width, 0); g.rotate(Math.PI / 2); } const W = spec.rot ? c.height : c.width, H = spec.rot ? c.width : c.height; for (let y = 0; y < H; y += s) for (let x = 0; x < W; x += s) g.drawImage(im, x, y, s, s); g.restore(); }
    if (spec.tint) { g.globalCompositeOperation = 'multiply'; g.fillStyle = spec.tint; g.fillRect(0, 0, c.width, c.height); g.globalCompositeOperation = 'source-over'; }
    if (spec.wash) { g.fillStyle = spec.wash; g.fillRect(0, 0, c.width, c.height); }
    if (spec.courses) { g.strokeStyle = 'rgba(120,100,80,.28)'; g.lineWidth = 1.5; for (let y = 0; y < c.height; y += 0.52 * PX) { g.beginPath(); g.moveTo(0, y); g.lineTo(c.width, y); g.stroke(); const off = (Math.round(y / (0.52 * PX)) % 2) * 0.6 * PX; for (let x = off; x < c.width; x += 1.2 * PX) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 0.52 * PX); g.stroke(); } } }
    for (let f = 0; f < 3; f++) for (let b = 0; b < 4; b++) {
      const bx = b * BAY * PX, fy = c.height - (f + 1) * FL * PX, [ww, wh, wy] = spec.win, x = bx + (BAY - ww) / 2 * PX, y = fy + (FL - wy - wh) * PX, w = ww * PX, h = wh * PX;
      if (spec.surround) { g.fillStyle = spec.surround; g.fillRect(x - 0.14 * PX, y - 0.14 * PX, w + 0.28 * PX, h + 0.2 * PX); }
      if (spec.lintel) { g.fillStyle = spec.lintel; g.fillRect(x - 0.12 * PX, y - 0.3 * PX, w + 0.24 * PX, 0.24 * PX); g.fillRect(x - 0.1 * PX, y + h, w + 0.2 * PX, 0.12 * PX); }
      glassFill(g, x, y, w, h);
      g.strokeStyle = spec.frame; g.lineWidth = Math.max(2, 0.07 * PX); g.strokeRect(x, y, w, h);
      g.lineWidth = Math.max(1.5, 0.045 * PX); g.beginPath(); const cols = spec.cols || 2;
      for (let k = 1; k < cols; k++) { g.moveTo(x + w * k / cols, y); g.lineTo(x + w * k / cols, y + h); }
      for (let k = 1; k < (spec.rows || 1); k++) { g.moveTo(x, y + h * k / spec.rows); g.lineTo(x + w, y + h * k / spec.rows); }
      g.stroke();
      if (spec.shutters) { const sw = w / 2; g.fillStyle = spec.shutters; const closed = rnd() < 0.18; if (closed) g.fillRect(x, y, w, h); else { g.fillRect(x - sw - 0.06 * PX, y, sw, h); g.fillRect(x + w + 0.06 * PX, y, sw, h); } g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 1; for (let k = 0; k < h; k += 0.12 * PX) { g.beginPath(); if (closed) { g.moveTo(x, y + k); g.lineTo(x + w, y + k); } else { g.moveTo(x - sw - 0.06 * PX, y + k); g.lineTo(x - 0.06 * PX, y + k); g.moveTo(x + w + 0.06 * PX, y + k); g.lineTo(x + w + sw + 0.06 * PX, y + k); } g.stroke(); } }
      if (spec.railing && (spec.railing === 'all' || f === 1)) { const ry = y + h - 0.95 * PX, rx0 = spec.railing === 'all' ? x - 0.1 * PX : bx + 0.05 * PX, rx1 = spec.railing === 'all' ? x + w + 0.1 * PX : bx + BAY * PX - 0.05 * PX; g.strokeStyle = '#1f2326'; g.lineWidth = 2; g.beginPath(); g.moveTo(rx0, ry); g.lineTo(rx1, ry); g.moveTo(rx0, ry + 0.45 * PX); g.lineTo(rx1, ry + 0.45 * PX); for (let k = rx0; k <= rx1; k += 0.11 * PX) { g.moveTo(k, ry); g.lineTo(k, y + h); } g.stroke(); }
      if (spec.band && f === 1) { g.fillStyle = spec.band; g.fillRect(0, fy + FL * PX - 0.22 * PX, c.width, 0.22 * PX); }
    }
    return keep(new THREE.MeshStandardMaterial({ map: canvasTex(c, TW, TH), roughness: 0.85 }));
  }
  // Même ordre que STYLES dans quartier-plan.js.
  const STYLES = [
    { img: 'beige_wall_001', tint: '#f1e6d2', wash: 'rgba(255,248,235,.25)', courses: true, win: [1.25, 2.3, 0.25], frame: '#f3efe7', surround: '#efe5d3', railing: 'f1', band: '#e9dfcc', mansard: true },
    { img: 'red_brick_03', win: [1.35, 1.65, 0.75], frame: '#f2f0ea', lintel: '#d9cdb8', base: '#9c4a36' },
    { img: 'brick_wall_006', tint: '#f3d2b8', win: [2.3, 2.0, 0.55], frame: '#25282b', cols: 3, rows: 2, base: '#b86a45' },
    { img: 'white_plaster_02', tint: '#ffffff', wash: 'rgba(255,255,255,.55)', win: [2.5, 2.2, 0.15], frame: '#3a3f44', cols: 3, balcony: 'concrete', base: '#eeeeea' },
    { img: 'red_plaster_weathered', tint: '#f6c3a4', win: [1.1, 1.85, 0.55], frame: '#f2efe8', shutters: '#5d7d5a', base: '#c9826a' },
    { img: 'raw_plank_wall', rot: true, tint: '#e9c9a1', win: [2.1, 2.3, 0.2], frame: '#2b2a28', balcony: 'wood', base: '#a8865f' },
    { img: 'painted_plaster_wall', tint: '#e9ecec', win: [1.3, 2.35, 0.2], frame: '#2e3438', railing: 'all', balcony: 'steel', base: '#d8dbdb' },
    { img: 'beige_wall_001', tint: '#e8b878', win: [1.15, 1.8, 0.6], frame: '#f4f1ea', shutters: '#f1ede4', base: '#d9a46a' },
    { img: 'painted_plaster_wall', tint: '#c9d8c2', win: [1.3, 2.0, 0.45], frame: '#f4f1ea', surround: '#e6ece0', railing: 'f1', base: '#bccbb5' },
  ];
  for (const s of STYLES) s.mat = facade(s);
  // Rez-de-chaussée commercial : vitrines + bandeau d'enseigne coloré (tuile 4 travées × 4,2 m), éclairé la nuit.
  const FASCIA = ['#2f5d50', '#8b3a2e', '#1f3b5a', '#c58b2b', '#5b3b5e', '#3a6b7a', '#7a5a2e', '#2d2d2d', '#a8473a', '#4d7a3a'];
  function shopMat() {
    const c = document.createElement('canvas'); c.width = Math.round(TW * PX); c.height = Math.round(GF * PX); const g = c.getContext('2d');
    const e = document.createElement('canvas'); e.width = c.width; e.height = c.height; const ge = e.getContext('2d'); ge.fillStyle = '#000'; ge.fillRect(0, 0, e.width, e.height);
    g.fillStyle = '#d8d2c6'; g.fillRect(0, 0, c.width, c.height);
    for (let b = 0; b < 4; b++) {
      const x = b * BAY * PX; g.fillStyle = pick(FASCIA); g.fillRect(x + 0.08 * PX, 0.25 * PX, (BAY - 0.16) * PX, 0.62 * PX);
      g.fillStyle = 'rgba(255,248,230,.9)'; const tw = rr(1.1, 2.2) * PX; g.fillRect(x + (BAY * PX - tw) / 2, 0.45 * PX, tw, 0.2 * PX); ge.fillStyle = '#fff4dc'; ge.fillRect(x + (BAY * PX - tw) / 2, 0.45 * PX, tw, 0.2 * PX);
      const gy = 1.0 * PX, gh = (GF - 1.0) * PX, gx = x + 0.18 * PX, gw = (BAY - 0.36) * PX;
      const gr = g.createLinearGradient(0, gy, 0, gy + gh); gr.addColorStop(0, '#6f8796'); gr.addColorStop(1, '#2a3239'); g.fillStyle = gr; g.fillRect(gx, gy, gw, gh);
      ge.fillStyle = '#c9a26a'; ge.fillRect(gx, gy, gw, gh);
      g.fillStyle = 'rgba(245,214,160,.55)'; g.fillRect(gx, gy + gh * 0.15, gw, gh * 0.12);
      for (let k = 0; k < 5; k++) { g.fillStyle = pick(['rgba(214,120,90,.7)', 'rgba(240,220,170,.7)', 'rgba(120,170,140,.7)', 'rgba(90,120,170,.7)']); g.fillRect(gx + rr(0.1, 0.8) * gw, gy + gh * rr(0.45, 0.75), 0.35 * PX, 0.5 * PX); }
      g.strokeStyle = '#1e2124'; g.lineWidth = 4; g.strokeRect(gx, gy, gw, gh); if (b % 2) { g.beginPath(); g.moveTo(gx + gw * 0.62, gy); g.lineTo(gx + gw * 0.62, gy + gh); g.stroke(); }
    }
    return keep(new THREE.MeshStandardMaterial({ map: canvasTex(c, TW, GF), emissiveMap: canvasTex(e, TW, GF), emissive: '#ffffff', emissiveIntensity: 0, roughness: 0.5, metalness: 0.1 }));
  }
  const SHOPS = [shopMat(), shopMat(), shopMat()];

  // ---------- immeubles ----------
  function prism(w, d, h, inset) { // toit à la Mansart
    const a = w / 2, b = d / 2, c = a - inset, e = b - inset, v = [[-a, 0, -b], [a, 0, -b], [a, 0, b], [-a, 0, b], [-c, h, -e], [c, h, -e], [c, h, e], [-c, h, e]], pos = [], uv = [];
    for (const [p, q, r, s] of [[0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7], [4, 5, 6, 7]]) for (const i of [p, q, r, p, r, s]) { pos.push(...v[i]); uv.push(0, 0); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals(); return g;
  }
  const awnings = [], awnCol = [], balcSlab = [], balcWood = [], balcRail = [], pvs = [], greenRoofs = [], pergola = [], planters = [], dormers = [], chimneys = [];
  const plan = buildPlan();
  function building({ fp, face, style, floors }) {
    const [x0, x1, z0, z1] = fp, w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, st = STYLES[style], top = GF + floors * FL;
    put(pick(SHOPS), mbox(w, GF, d), cx, Y + GF / 2, cz);
    put(st.mat, mbox(w, floors * FL, d), cx, Y + GF + floors * FL / 2, cz);
    put(M.cornice, mbox(w + 0.5, 0.35, d + 0.5), cx, Y + GF - 0.1, cz);
    put(M.cornice, mbox(w + 0.6, 0.45, d + 0.6), cx, Y + top + 0.2, cz);
    const along = face === '+z' || face === '-z' ? 'x' : 'z', L = along === 'x' ? w : d, sgn = face[0] === '+' ? 1 : -1;
    const fx = along === 'x' ? null : (sgn > 0 ? x1 : x0), fz = along === 'x' ? (sgn > 0 ? z1 : z0) : null;
    const at = (t, out, y) => along === 'x' ? [x0 + t, y, fz + sgn * out] : [fx + sgn * out, y, z0 + t];
    const ry = face === '+z' ? 0 : face === '-z' ? Math.PI : face === '+x' ? Math.PI / 2 : -Math.PI / 2;
    for (let t = BAY / 2; t < L; t += BAY) if (rnd() < 0.55) { const [ax, ay, az] = at(t, 0.75, Y + 3.15); awnings.push(mat4(ax, ay, az, ry, 2.7, 0.08, 1.6, 0.42)); awnCol.push(pick(['#c94f3d', '#2f6b57', '#e2b74a', '#25476b', '#f0ece2', '#8a4d74', '#d7783a'])); }
    if (st.balcony) for (let f = 1; f < floors; f++) for (let t = BAY / 2; t < L; t += BAY) { if (st.balcony !== 'concrete' && (Math.floor(t / BAY) + f) % 2) continue; const yb = Y + GF + f * FL; const [bx, by, bz] = at(t, 0.65, yb); (st.balcony === 'wood' ? balcWood : balcSlab).push(mat4(bx, by, bz, ry, BAY - 0.2, 0.16, 1.3)); const [rx, ryy, rz] = at(t, 1.28, yb + 0.55); balcRail.push(mat4(rx, ryy, rz, ry, BAY - 0.2, 1.0, 0.04)); if (rnd() < 0.35) { const [px, py, pz] = at(t + rr(-0.9, 0.9), 0.9, yb + 0.1); planters.push(mat4(px, py + 0.35, pz, 0, rr(0.5, 0.8), rr(0.5, 0.9), rr(0.5, 0.8))); } }
    const ty = Y + top + 0.42;
    if (st.mansard) {
      put(M.zinc, prism(w + 0.2, d + 0.2, 3.4, 1.5), cx, ty, cz); put(M.slate, mbox(w - 3.2, 0.2, d - 3.2), cx, ty + 3.4, cz);
      for (let t = BAY / 2; t < L; t += BAY) { const [dx, dy, dz] = at(t, -0.75, ty + 1.3); dormers.push(mat4(dx, dy, dz, ry, 1.3, 1.9, 1.2)); }
      for (let k = 0; k < Math.max(1, Math.round(L / 9)); k++) chimneys.push(mat4(cx + (along === 'x' ? rr(-w / 2 + 2, w / 2 - 2) : 0), ty + 4.1, cz + (along === 'z' ? rr(-d / 2 + 2, d / 2 - 2) : 0), 0, 1.4, 1.6, 0.6));
    } else {
      const r = rnd();
      if (r < 0.45) { for (let a = x0 + 1.6; a < x1 - 1.2; a += 2.1) for (let b = z0 + 1.6; b < z1 - 1.2; b += 1.3) pvs.push(mat4(a, ty + 0.45, b, 0, 1.9, 0.05, 1.1, -0.5)); }
      else if (r < 0.8) { greenRoofs.push(mat4(cx, ty + 0.12, cz, 0, w - 1, 0.24, d - 1)); const n = Math.round(w * d / 40); for (let k = 0; k < n; k++) plant(rnd() < 0.7 ? 'buisson' : 'buisson-fleuri', rr(x0 + 1, x1 - 1), ty + 0.24, rr(z0 + 1, z1 - 1), rr(0.6, 1)); }
      else { put(M.deck, mbox(w - 1.2, 0.1, d - 1.2), cx, ty + 0.05, cz); for (let a = x0 + 1.5; a < x1 - 1; a += 2.5) pergola.push(mat4(a, ty + 2.6, cz, 0, 0.12, 0.12, d - 3)); for (let k = 0; k < 3; k++) plant('feuillu-rond', rr(x0 + 2, x1 - 2), ty + 0.1, rr(z0 + 2, z1 - 2), rr(0.25, 0.4)); }
    }
    for (let t = 2; t < L; t += rr(4, 9)) { const [px, , pz] = at(t, rr(1.2, 3.5), 0); person(px, pz); }
  }
  for (const h of plan.houses) building(h);
  // ruelles plantées et cours
  target = fine;
  for (const [x0, x1, zt, z1] of plan.lanes) for (let x = x0 + 6; x < x1 - 4; x += rr(10, 18)) { const k = [x - 1, x + 1, zt + 1, z1 - 1]; if (plan.keepHit(k, [])) continue; if (plan.houses.some(h => h.fp[0] < k[1] && h.fp[1] > k[0] && h.fp[2] < k[3] && h.fp[3] > k[2])) continue; plant(pick(['feuillu-rond', 'arbre-feuillu']), x, Y, (zt + z1) / 2, rr(0.55, 0.75)); person(x + rr(-4, 4), zt + rr(1, z1 - zt - 1)); }
  target = root;
  for (const [ix0, ix1, iz0, iz1, kp] of plan.courts) if (ix1 - ix0 > 8 && iz1 - iz0 > 8 && !keepHit([ix0, ix1, iz0, iz1], kp)) {
    add(mbox(ix1 - ix0, 0.12, iz1 - iz0), M.lawn, (ix0 + ix1) / 2, Y + 0.06, (iz0 + iz1) / 2, { cast: false });
    const n = Math.round((ix1 - ix0) * (iz1 - iz0) / 160); for (let k = 0; k < n; k++) plant(pick(['feuillu-rond', 'arbre-feuillu']), rr(ix0 + 3, ix1 - 3), Y, rr(iz0 + 3, iz1 - 3), rr(0.7, 1));
  }

  // ---------- mobilier ----------
  const benches = [], shelters = [], adPanels = [], shelterRoofs = [], umbrellas = [], umbCol = [], tables = [], lampPosts = [], marks = [], curbs = [];
  function abribus(x, z, ry = 0, big = false) { const L = big ? 14 : 4.2, s = Math.sin(ry), c = Math.cos(ry), off = (u, v) => [x + c * u + s * v, z - s * u + c * v]; shelterRoofs.push(mat4(x, Y + 2.7, z, ry, L, 0.22, 2.0)); let [bx, bz] = off(0, -0.9); shelters.push(mat4(bx, Y + 1.35, bz, ry, L, 2.5, 0.03)); for (const u of [-L / 2, L / 2]) { const [px, pz] = off(u, 0); shelters.push(mat4(px, Y + 1.35, pz, ry, 0.03, 2.5, 1.8)); } [bx, bz] = off(L / 2 + 0.6, -0.3); adPanels.push(mat4(bx, Y + 1.25, bz, ry, 1.25, 1.9, 0.18)); [bx, bz] = off(0, -0.5); benches.push(mat4(bx, Y + 0.45, bz, ry, L * 0.6, 0.08, 0.45)); for (let k = 0; k < (big ? 8 : 3); k++) { const [px, pz] = off(rr(-L / 2, L / 2), rr(-0.3, 1.6)); person(px, pz); } }
  function terrace(x, z, ry, n = 4) { const s = Math.sin(ry), c = Math.cos(ry); for (let k = 0; k < n; k++) { const u = (k - (n - 1) / 2) * 2.6, v = rr(0.4, 1.4), px = x + c * u + s * v, pz = z - s * u + c * v; umbrellas.push(mat4(px, Y + 2.35, pz, rr(0, 1), 1.3, 0.5, 1.3)); umbCol.push(pick(['#f3efe5', '#c9573f', '#2f6b57', '#e4c070'])); tables.push(mat4(px, Y + 0.75, pz, 0, 0.8, 0.05, 0.8)); for (let q = 0; q < 2; q++) if (rnd() < 0.8) person(px + rr(-0.8, 0.8), pz + rr(-0.8, 0.8)); } }
  function fountain(x, z, r) {
    target = root; put(M.stone, new THREE.TorusGeometry(r, 0.35, 8, 48).rotateX(Math.PI / 2), x, Y + 0.45, z); put(M.stone, new THREE.CylinderGeometry(r, r, 0.3, 48), x, Y + 0.15, z);
    add(new THREE.CircleGeometry(r - 0.2, 48).rotateX(-Math.PI / 2), M.water, x, Y + 0.55, z, { cast: false });
    put(M.stone, new THREE.CylinderGeometry(r * 0.25, r * 0.32, 1.2, 24), x, Y + 1.1, z); put(M.stone, new THREE.CylinderGeometry(r * 0.45, r * 0.2, 0.3, 24), x, Y + 1.8, z);
    put(M.jet, new THREE.CylinderGeometry(0.08, 0.3, 4.5, 8), x, Y + 4, z); for (let k = 0; k < 10; k++) { const a = k / 10 * 6.28, g = new THREE.CylinderGeometry(0.03, 0.08, 2.2, 5); g.rotateZ(0.55); g.translate(0.9, 0, 0); g.rotateY(-a); put(M.jet, g, x + Math.cos(a) * r * 0.5, Y + 1.5, z + Math.sin(a) * r * 0.5); }
    target = fine; for (let k = 0; k < 14; k++) { const a = rr(0, 6.28), d = r + rr(0.6, 3); person(x + Math.cos(a) * d, z + Math.sin(a) * d); }
    for (let k = 0; k < 6; k++) { const a = k / 6 * 6.28 + 0.3; benches.push(mat4(x + Math.cos(a) * (r + 4), Y + 0.45, z + Math.sin(a) * (r + 4), -a + Math.PI / 2, 2.2, 0.08, 0.5)); }
  }
  function market(x, z, n) { for (let k = 0; k < n; k++) { const px = x + (k - (n - 1) / 2) * 4.2; put(M.white, mbox(3.6, 0.9, 2), px, Y + 0.45, z); umbrellas.push(mat4(px, Y + 2.6, z, 0, 2.8, 0.25, 2.2)); umbCol.push(pick(['#c9573f', '#2f6b57', '#e4c070', '#3d6fa6', '#f3efe5'])); for (let q = 0; q < 4; q++) person(px + rr(-2, 2), z + rr(1.5, 4)); } }
  function metroEntrance(x, z) { const g = new THREE.SphereGeometry(4.2, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2); g.scale(1.6, 0.75, 1); add(g, M.glass, x, Y, z, { cast: false }); put(M.steel, new THREE.TorusGeometry(4.2, 0.1, 6, 32).rotateX(Math.PI / 2).scale(1.6, 1, 1), x, Y + 0.05, z); put(M.dark, mbox(3.6, 0.1, 7), x, Y + 0.02, z); for (let k = 0; k < 6; k++) person(x + rr(-6, 6), z + rr(-6, 6)); }
  const car = (x, z, ry) => cars.push([x, z, ry, pick(['#e9e9e6', '#2c3e50', '#a83a2e', '#6f7c80', '#1d1f22', '#3f6e8c', '#d9c9a3', '#486b4c'])]);

  // ---------- boulevard du tramway ----------
  const tramTex = (() => { const c = document.createElement('canvas'); c.width = 512; c.height = 128; const g = c.getContext('2d'); g.fillStyle = '#f3f4f1'; g.fillRect(0, 0, 512, 128); g.fillStyle = '#2f8a5e'; g.fillRect(0, 98, 512, 16); g.fillStyle = '#1b2a33'; g.fillRect(0, 28, 512, 50); g.fillStyle = 'rgba(160,200,215,.5)'; for (let x = 0; x < 512; x += 64) g.fillRect(x + 4, 32, 54, 20); g.fillStyle = '#e8e9e4'; for (let x = 0; x < 512; x += 64) g.fillRect(x, 28, 5, 50); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; disposables.push(t); return t; })();
  const tramMat = keep(new THREE.MeshStandardMaterial({ map: tramTex, roughness: 0.35, metalness: 0.2 }));
  function tram(x, z) { const mods = 5, ml = 8.6; for (let k = 0; k < mods; k++) { const g = new THREE.BoxGeometry(ml - 0.3, 3.0, 2.65), uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * 2); const mx = x + (k - (mods - 1) / 2) * ml; put(tramMat, g, mx, Y + 1.85, z); put(M.dark, new THREE.BoxGeometry(0.4, 2.6, 2.4), mx + ml / 2, Y + 1.8, z); put(M.white, mbox(2.2, 0.35, 1.6), mx, Y + 3.5, z); }
    for (const e of [-1, 1]) { const fx = x + e * (mods * ml / 2 + 0.35); put(M.white, new THREE.BoxGeometry(1.0, 3.0, 2.55), fx, Y + 1.85, z); put(M.dark, new THREE.BoxGeometry(0.12, 1.5, 2.3), fx + e * 0.5, Y + 2.45, z); put(M.green, new THREE.BoxGeometry(0.14, 0.35, 2.4), fx + e * 0.5, Y + 0.9, z); for (const s of [-0.9, 0.9]) put(M.lampHead, new THREE.BoxGeometry(0.1, 0.2, 0.5), fx + e * 0.56, Y + 1.25, z + s); }
    const g = new THREE.BoxGeometry(1, 1, 1); g.applyMatrix4(beamMatrix(new THREE.Vector3(x - 0.6, Y + 3.7, z), new THREE.Vector3(x + 0.2, Y + 6.2, z), 0.05, 0.05)); put(M.dark, g, 0, 0, 0); }
  {
    const { z, x0, x1, stops } = TRAM, SWW = 4, RD = 6.5, PL = 3, TK = 7, half = SWW + RD + PL + TK / 2, L = x1 - x0, cx = (x0 + x1) / 2;
    add(mbox(L, 0.18, SWW), M.sidewalk, cx, Y + 0.07, z + half - SWW / 2, { cast: false }); add(mbox(L, 0.18, SWW), M.sidewalk, cx, Y + 0.07, z - half + SWW / 2, { cast: false });
    for (const s of [1, -1]) { add(mbox(L, 0.08, RD), M.asphalt, cx, Y + 0.03, z + s * (TK / 2 + PL + RD / 2), { cast: false }); for (let x = x0 + 4; x < x1 - 4; x += 9) marks.push(mat4(x, Y + 0.075, z + s * (TK / 2 + PL + RD / 2), 0, 3, 0.01, 0.14)); curbs.push(mat4(cx, Y + 0.09, z + s * (half - SWW), 0, L, 0.2, 0.25)); }
    add(mbox(L, 0.14, TK + 2 * PL), M.lawn, cx, Y + 0.05, z, { cast: false });
    const rails = []; for (const tz of [-1.8, 1.8]) for (const gg of [-0.72, 0.72]) rails.push(mat4(cx, Y + 0.16, z + tz + gg, 0, L, 0.1, 0.08)); inst(UNIT, M.rail, rails, false);
    for (const sx of stops) for (const s of [1, -1]) { add(mbox(48, 0.32, PL), M.paving, sx, Y + 0.16, z + s * (TK / 2 + PL / 2), { cast: false }); target = fine; abribus(sx + s * 8, z + s * (TK / 2 + PL - 0.6), s > 0 ? Math.PI : 0, true); target = root; }
    for (let x = x0 + 8; x < x1 - 8; x += 14) { if (stops.some(s => Math.abs(s - x) < 28)) continue; for (const s of [1, -1]) plant('feuillu-eleve', x, Y, z + s * (TK / 2 + PL / 2), rr(0.75, 0.95)); }
    const poles = [], wires = []; for (let x = x0 + 5; x < x1; x += 32) { poles.push(mat4(x, Y + 3.6, z, 0, 0.22, 7.2, 0.22)); wires.push(mat4(x, Y + 6.9, z, 0, 0.12, 0.12, 6.4)); }
    for (const tz of [-1.8, 1.8]) wires.push(mat4(cx, Y + 6.2, z + tz, 0, L, 0.03, 0.03));
    inst(UNIT, M.steel, poles); inst(UNIT, M.dark, wires, false);
    for (let x = x0 + 12; x < x1; x += 30) for (const s of [1, -1]) lampPosts.push(mat4(x, Y, z + s * (half - 0.6)));
    tram(96, z + 1.8); tram(-70, z - 1.8);
    target = fine; for (let k = 0; k < L / 7; k++) person(rr(x0, x1), z + pick([1, -1]) * (half - rr(0.5, 3.5)));
    for (let x = x0 + 10; x < x1 - 10; x += rr(14, 30)) car(x, z + pick([1, -1]) * (TK / 2 + PL + rr(1.6, 4.8)), 0); target = root;
  }

  // ---------- place des Fontaines ----------
  {
    const [x0, x1, z0, z1] = SQUARE.rect, sp = SQUARE.groveStep;
    add(mbox(x1 - x0, 0.4, z1 - z0), M.cobble, (x0 + x1) / 2, Y - 0.18, (z0 + z1) / 2, { cast: false });
    const [fx, fz, fr] = SQUARE.fountain, groveKeep = [{ x: fx, z: fz, r: fr + 7 }, { rect: [-40, 16, -500, -488] }];
    for (let x = x0 + sp / 2; x < x1; x += sp) for (let z = z0 + sp / 2; z < z1; z += sp) { if (keepHit([x - 1, x + 1, z - 1, z + 1], groveKeep)) continue; plant('feuillu-eleve', x, Y, z, rr(0.85, 1)); put(M.stone, new THREE.CylinderGeometry(1.3, 1.3, 0.45, 16), x, Y + 0.22, z); if (rnd() < 0.5) benches.push(mat4(x + sp / 2, Y + 0.45, z, 0, 2, 0.08, 0.5)); if (rnd() < 0.7) person(x + rr(-3, 3), z + rr(-3, 3)); }
    fountain(fx, fz, fr); target = fine; market(SQUARE.market[0], SQUARE.market[1], SQUARE.market[2]); terrace(18, -540, -Math.PI / 2, 4); terrace(-46, -540, Math.PI / 2, 4); target = root; metroEntrance(...SQUARE.metro);
  }
  target = fine;
  for (const [x, z, ry] of [[33.7, -420, Math.PI / 2], [46.3, -520, -Math.PI / 2], [-142.6, -410, -Math.PI / 2]]) abribus(x, z, ry);
  for (const [x, z, n] of [[-15, -400, 30], [90, -400, 25], [160, -400, 20], [300, -386, 30], [300, -440, 20]]) for (let k = 0; k < n; k++) person(x + rr(-12, 12), z + rr(-12, 12));
  // voitures garées / circulant dans les rues
  for (const r of STREETS) { const len = Math.hypot(r.b[0] - r.a[0], r.b[1] - r.a[1]); for (let t = 12; t < len - 12; t += rr(25, 60)) { const u = t / len, x = r.a[0] + (r.b[0] - r.a[0]) * u, z = r.a[1] + (r.b[1] - r.a[1]) * u, side = pick([-1, 1]) * 2.4; car(r.ns ? x + side : x, r.ns ? z : z + side, r.ns ? 0 : Math.PI / 2); } }
  target = root;

  // ---------- La Flèche (700 m) ----------
  {
    const { x, z, base } = FLECHE;
    const cw = document.createElement('canvas'); cw.width = 256; cw.height = 512; { const g = cw.getContext('2d'), gr = g.createLinearGradient(0, 0, 256, 512); gr.addColorStop(0, '#7890a0'); gr.addColorStop(0.5, '#8996a0'); gr.addColorStop(1, '#6a7a86'); g.fillStyle = gr; g.fillRect(0, 0, 256, 512); g.fillStyle = 'rgba(150,120,85,.85)'; for (let i = 0; i < 4; i++) g.fillRect(i * 64, 0, 3, 512); g.fillStyle = 'rgba(120,98,70,.55)'; for (let j = 0; j < 3; j++) g.fillRect(0, j * 171, 256, 4); }
    const cwTex = canvasTex(cw, 6, 12);
    const glow = document.createElement('canvas'); glow.width = 256; glow.height = 512; { const g = glow.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, 256, 512); for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) if (rnd() < 0.55) { g.fillStyle = rnd() < 0.7 ? '#ffd9a0' : '#e8f1ff'; g.fillRect(i * 64 + 4, j * 171 + 6, 58, 160); } }
    const skin = keep(new THREE.MeshPhysicalMaterial({ map: cwTex, color: '#f2ece2', metalness: 0.38, roughness: 0.16, clearcoat: 0.7, envMapIntensity: 1.25, emissiveMap: canvasTex(glow, 6, 12), emissive: '#ffffff', emissiveIntensity: 0 }));
    const crownMat = keep(new THREE.MeshPhysicalMaterial({ map: cwTex, color: '#dfe9ef', metalness: 0.6, roughness: 0.12, clearcoat: 1, envMapIntensity: 1.5, side: THREE.DoubleSide, emissive: '#bfe6ff', emissiveIntensity: 0 }));
    M.flecheSkin = skin; M.flecheCrown = crownMat;
    const SHAFTS = [[0, 0, 50, 50, 640], [0, 40, 50, 30, 560], [40, 10, 30, 80, 470], [-10, -40, 80, 30, 400], [-40, -5, 30, 60, 520], [45, 45, 30, 30, 300], [-45, -45, 30, 30, 240], [-45, 45, 30, 30, 380], [45, -45, 30, 30, 330]];
    const frames = [], diag = [];
    for (const [dx, dz, w, d, top] of SHAFTS) {
      const cx = x + dx, cz = z + dz, h = top - base;
      add(mbox(w, h, d), skin, cx, base + h / 2, cz);
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) frames.push(mat4(cx + sx * w / 2, base + h / 2, cz + sz * d / 2, 0, 1.6, h, 1.6));
      frames.push(mat4(cx, top, cz + d / 2, 0, w + 1.6, 1.6, 1.6), mat4(cx, top, cz - d / 2, 0, w + 1.6, 1.6, 1.6), mat4(cx + w / 2, top, cz, 0, 1.6, 1.6, d + 1.6), mat4(cx - w / 2, top, cz, 0, 1.6, 1.6, d + 1.6));
      const n = Math.max(1, Math.round(h / 190)), seg = h / n;
      for (const [nx, nz, span] of [[0, 1, w], [0, -1, w], [1, 0, d], [-1, 0, d]]) for (let k = 0; k < n; k++) { const y0 = base + k * seg, y1 = y0 + seg, P = (s, y) => new THREE.Vector3(cx + nx * (w / 2 + 0.3) + (nz ? s : 0), y, cz + nz * (d / 2 + 0.3) + (nx ? s : 0)); const b = P(0, y0), t = P(0, y1), l = P(-span / 2, (y0 + y1) / 2), r = P(span / 2, (y0 + y1) / 2); diag.push(beamMatrix(b, l, 1.1, 1.1), beamMatrix(l, t, 1.1, 1.1), beamMatrix(t, r, 1.1, 1.1), beamMatrix(r, b, 1.1, 1.1)); }
      if (top < 640) { put(M.lawn, mbox(w - 2, 0.8, d - 2), cx, top + 0.6, cz); const nT = Math.round(w * d / 90); for (let k = 0; k < nT; k++) plant(k % 3 ? 'feuillu-rond' : 'arbre-feuillu', cx + rr(-w / 2 + 3, w / 2 - 3), top + 1, cz + rr(-d / 2 + 3, d / 2 - 3), rr(0.6, 0.85)); add(mbox(w - 1, 1.2, 0.2), M.glass, cx, top + 1.6, cz + d / 2 - 0.6, { cast: false }); }
    }
    inst(UNIT, M.bronze, frames); inst(UNIT, M.bronze, diag);
    { const w = 50, h2 = w / 2, v = [[-h2, 640, -h2], [h2, 640, -h2], [h2, 640, h2], [-h2, 640, h2], [-h2, 652, -h2], [h2, 652, -h2], [h2, 700, h2], [-h2, 700, h2]].map(([a, b, c]) => [x + a, b, z + c]);
      const pos = [], idx = [], uv = [];
      for (const q of [[0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7], [4, 5, 6, 7]]) { const o = pos.length / 3, P = q.map(i => new THREE.Vector3(...v[i])), e1 = P[1].clone().sub(P[0]).normalize(), a3 = P[3].clone().sub(P[0]), e2 = a3.clone().sub(e1.clone().multiplyScalar(a3.dot(e1))).normalize(); for (const pt of P) { pos.push(pt.x, pt.y, pt.z); const dd = pt.clone().sub(P[0]); uv.push(dd.dot(e1), P[0].y + dd.dot(e2)); } idx.push(o, o + 1, o + 2, o, o + 2, o + 3); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); add(g, crownMat);
      inst(UNIT, M.bronze, [[4, 5], [5, 6], [6, 7], [7, 4], [1, 5], [2, 6], [3, 7], [0, 4], [4, 6], [5, 7]].map(([a, b]) => beamMatrix(new THREE.Vector3(...v[a]), new THREE.Vector3(...v[b]), 1.6, 1.6))); }
    const V = [];
    for (const [nx, nz] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) for (let k = 0; k < 5; k++) { const s0 = -48 + k * 24, foot = new THREE.Vector3(x + nx * 54 + (nz ? s0 : 0), 0, z + nz * 54 + (nx ? s0 : 0)); for (const ds of [-12, 12]) V.push(beamMatrix(foot, new THREE.Vector3(x + nx * 60 + (nz ? s0 + ds : 0), base, z + nz * 60 + (nx ? s0 + ds : 0)), 2.2, 2.2)); }
    inst(UNIT, M.bronze, V);
    add(mbox(122, 2.4, 122), M.bronze, x, base - 1.2, z); add(mbox(119, 0.3, 119), M.glulam, x, base - 2.5, z, { cast: false });
    add(mbox(84, base - 3, 84), M.glass, x, (base - 3) / 2, z, { cast: false }); add(mbox(26, base - 3, 26), M.concrete, x, (base - 3) / 2, z);
    for (let k = 0; k < 16; k++) { const a = k / 16 * 6.28; plant('feuillu-eleve', x + Math.cos(a) * 50, Y, z + Math.sin(a) * 50, rr(0.8, 1)); }
    target = fine; for (let k = 0; k < 120; k++) { const px = x + rr(-58, 58), pz = z + rr(-58, 58); if (Math.abs(px - x) < 43 && Math.abs(pz - z) < 43) continue; person(px, pz); } target = root;
  }

  // ---------- instances ----------
  inst(UNIT, M.tint, awnings, true, awnCol);
  inst(UNIT, M.concrete, balcSlab); inst(UNIT, M.deck, balcWood); inst(UNIT, M.glass, balcRail, false);
  inst(UNIT, M.pv, pvs); inst(UNIT, M.lawn, greenRoofs, false); inst(UNIT, M.glulam, pergola); inst(new THREE.IcosahedronGeometry(1, 0), M.bush, planters);
  inst(UNIT, M.zinc, dormers); inst(UNIT, M.cornice, chimneys);
  inst(UNIT, M.curb, curbs, false); inst(UNIT, M.white, marks, false);
  { const pole = new THREE.CylinderGeometry(0.07, 0.1, 6, 6).translate(0, 3, 0), head = new THREE.SphereGeometry(0.32, 10, 8).translate(0, 6.1, 0); disposables.push(pole, head); inst(pole, M.dark, lampPosts); inst(head, M.lampHead, lampPosts); }
  target = fine;
  inst(UNIT, M.glass, shelters, false); inst(UNIT, M.ad, adPanels); inst(UNIT, M.green, shelterRoofs); inst(UNIT, M.glulam, benches);
  { const cone = new THREE.ConeGeometry(1, 1, 8), cyl = new THREE.CylinderGeometry(1, 1, 1, 12); disposables.push(cone, cyl); inst(cone, M.tint, umbrellas, false, umbCol); inst(cyl, M.white, tables); }
  { const body = new THREE.BoxGeometry(4.3, 0.8, 1.85).translate(0, 0.62, 0), cab = new THREE.BoxGeometry(2.3, 0.62, 1.66).translate(-0.2, 1.3, 0), wheel = new THREE.CylinderGeometry(0.33, 0.33, 1.9, 10).rotateX(Math.PI / 2); disposables.push(body, cab, wheel);
    const ms = cars.map(([x, z, ry]) => mat4(x, Y, z, ry)); inst(body, M.tint, ms, true, cars.map(c => c[3])); inst(cab, M.dark, ms); inst(wheel, M.dark, cars.flatMap(([x, z, ry]) => [-1.35, 1.35].map(u => mat4(x + Math.cos(ry) * u, Y + 0.33, z - Math.sin(ry) * u, ry)))); }
  { const torso = new THREE.CapsuleGeometry(0.19, 0.45, 2, 6).scale(1, 1, 0.7).translate(0, 1.22, 0), legs = new THREE.BoxGeometry(0.3, 0.86, 0.18).translate(0, 0.43, 0), head = new THREE.SphereGeometry(0.12, 6, 4).translate(0, 1.68, 0); disposables.push(torso, legs, head);
    const ms = people.map(([x, y, z]) => mat4(x, y, z, rnd() * 6.28, 1, rr(0.92, 1.06), 1));
    inst(torso, M.tint, ms, false, people.map(() => pick(['#2c3e50', '#c0392b', '#e8e2d4', '#3d6b8c', '#7a5c3e', '#2f6b57', '#d9a441', '#5b4a6e', '#1d1f22', '#b7c4cc', '#e07a5f', '#f2efe6'])));
    inst(legs, M.tint, ms, false, people.map(() => pick(['#2a2f36', '#3b4a63', '#4a4038', '#1d1f22', '#55595e', '#33415a'])));
    inst(head, M.tint, ms, false, people.map(() => pick(['#e0b896', '#c58c62', '#8d5a3b', '#f1cfaf', '#5a3a26']))); }
  target = root;
  flush();
  target = root; for (const [kind, ms] of Object.entries(lightPlants.root)) inst(LIGHT[kind], plantMat, ms, kind === 'tree');
  target = far; for (const [kind, ms] of Object.entries(lightPlants.far)) inst(LIGHT[kind], plantMat, ms, true);
  target = fine; for (const [id, ms] of Object.entries(glbPlants)) for (const p of veg[id]) inst(p.geo, p.mat, ms, true);
  target = root;
  void BUILDINGS;

  // ---------- interface ----------
  let lastX = Infinity, lastZ = Infinity;
  return {
    root,
    statistics: { immeubles: plan.houses.length, passants: people.length, voitures: cars.length, arretsTram: TRAM.stops.length },
    update(position) {
      if ((position.x - lastX) ** 2 + (position.z - lastZ) ** 2 < 100) return;
      lastX = position.x; lastZ = position.z;
      const cx = Math.max(SOLAR_BOX.minX, Math.min(SOLAR_BOX.maxX, position.x)), cz = Math.max(SOLAR_BOX.minZ, Math.min(SOLAR_BOX.maxZ, position.z));
      fine.visible = Math.hypot(position.x - cx, position.z - cz) < FINE_DISTANCE; far.visible = !fine.visible;
    },
    setNight(on) { for (const s of SHOPS) s.emissiveIntensity = on ? 0.85 : 0; M.lampHead.emissiveIntensity = on ? 3 : 0.3; M.ad.emissiveIntensity = on ? 1.4 : 0.6; M.flecheSkin.emissiveIntensity = on ? 0.55 : 0; M.flecheCrown.emissiveIntensity = on ? 0.45 : 0; },
    dispose() { root.removeFromParent(); root.traverse(o => { if (o.isInstancedMesh) o.dispose(); }); for (const d of disposables) d.dispose?.(); },
  };
}
