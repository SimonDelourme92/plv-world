// ATLAS — « Les montagnes suspendues » : étude de Simon (inspiration KING Toronto / BIG), portée dans le jeu.
// Géométrie, matériaux et répartition aléatoire (graine 47) repris de l'étude d'origine ; seul le contexte urbain
// de la maquette (routes, immeubles gris, sol) est retiré, et le parvis est légèrement recadré.
// 4 sommets de modules vitrés de 9 m, jardins en gradins, socle surélevé de 17,5 m sur piliers ramifiés.
import { ATLAS, NX, NZ, CELL, FLOOR, BASE, atlasHeights } from './atlas-layout.js';

const FINE_DISTANCE = 380; // m : montants fins, passants, bancs

export function createAtlas({ THREE, scene }) {
  const root = new THREE.Group(); root.name = 'ATLAS'; root.position.set(ATLAS.x, ATLAS.top + 0.02, ATLAS.z); root.rotation.y = ATLAS.rot; scene.add(root);
  const fine = new THREE.Group(); fine.name = 'ATLAS — détails'; root.add(fine);
  const disposables = [];
  let seed = 47; const random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };

  function brickRelief() {
    const c = document.createElement('canvas'); c.width = 128; c.height = 128; const ctx = c.getContext('2d');
    ctx.fillStyle = '#898989'; ctx.fillRect(0, 0, 128, 128);
    for (let x = 0; x < 4; x++) for (let y = 0; y < 3; y++) { const g = ctx.createLinearGradient(x * 32, y * 128 / 3, x * 32 + 30, y * 128 / 3 + 40); g.addColorStop(0, '#dddddd'); g.addColorStop(0.2, '#b0b0b0'); g.addColorStop(0.8, '#999999'); g.addColorStop(1, '#666666'); ctx.fillStyle = g; ctx.fillRect(x * 32 + 1, y * 128 / 3 + 1, 30, 128 / 3 - 2); }
    const t = new THREE.CanvasTexture(c); t.anisotropy = 4; disposables.push(t); return t;
  }
  const S = o => new THREE.MeshStandardMaterial(o);
  const materials = {
    glass: S({ color: 0x94b8b1, metalness: 0.48, roughness: 0.22, bumpMap: brickRelief(), bumpScale: 0.065 }),
    frame: S({ color: 0xd1d4c5, roughness: 0.65, metalness: 0.22 }), concrete: S({ color: 0xb0afa0, roughness: 0.88 }),
    dark: S({ color: 0x3b514d, roughness: 0.7, metalness: 0.25 }), soil: S({ color: 0x6c7961, roughness: 1 }), grass: S({ color: 0x77865c, roughness: 1 }),
    leaf: S({ color: 0x597553, roughness: 1 }), leaf2: S({ color: 0x829668, roughness: 1 }), leaf3: S({ color: 0x3f624e, roughness: 1 }), trunk: S({ color: 0x74624b, roughness: 1 }),
    paving: S({ color: 0xc7c6b5, roughness: 0.94 }), joint: S({ color: 0xaaa995, roughness: 1 }),
    water: new THREE.MeshPhysicalMaterial({ color: 0x588d89, metalness: 0.38, roughness: 0.16, clearcoat: 1 }),
    bronze: S({ color: 0x746b4f, roughness: 0.4, metalness: 0.65 }), warm: S({ color: 0xe6c497, emissive: 0xffc785, emissiveIntensity: 0.12, roughness: 0.5 }),
    people: S({ color: 0x4d5c59, roughness: 1 }), skin: S({ color: 0xb49376, roughness: 1 }),
  };
  disposables.push(...Object.values(materials));

  // Regroupement par matériau et géométrie (InstancedMesh). « fin » = visible seulement de près.
  const boxGeo = new THREE.BoxGeometry(1, 1, 1), sphereGeo = new THREE.IcosahedronGeometry(1, 0), cylGeo = new THREE.CylinderGeometry(1, 1, 1, 7);
  disposables.push(boxGeo, sphereGeo, cylGeo);
  const batches = new Map(), dummy = new THREE.Object3D();
  let fineMode = false;
  function put(mat, geo, x, y, z, sx, sy, sz, ry = 0, color = null, quat = null) { const key = mat + ':' + geo + ':' + (fineMode ? 'f' : 'r'); if (!batches.has(key)) batches.set(key, { mat, geo, fine: fineMode, items: [] }); batches.get(key).items.push({ x, y, z, sx, sy, sz, ry, color, quat }); }
  const box = (m, x, y, z, w, h, d, ry = 0, color = null) => put(m, 'box', x, y, z, w, h, d, ry, color);
  function beam(m, a, b, r) { const av = new THREE.Vector3(...a), bv = new THREE.Vector3(...b), delta = bv.clone().sub(av), mid = av.clone().add(bv).multiplyScalar(0.5); const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.clone().normalize()); put(m, 'cyl', mid.x, mid.y, mid.z, r, delta.length(), r, 0, null, q); }
  function tree(x, y, z, s = 1) { put('trunk', 'cyl', x, y + 1.4 * s, z, 0.14 * s, 2.8 * s, 0.14 * s); const leaf = ['leaf', 'leaf2', 'leaf3'][Math.floor(random() * 3)]; for (let n = 0; n < 3; n++) { const a = n * 2.4 + random(); put(leaf, 'sphere', x + Math.cos(a) * 0.55 * s, y + (3.15 + n * 0.44) * s, z + Math.sin(a) * 0.55 * s, 1.55 * s, (1.7 + n * 0.1) * s, 1.4 * s, random() * 6); } }
  function person(x, y, z, scale = 1, angle = 0) { const color = [0x3c5355, 0x7c735b, 0x9d6f56, 0x59666b, 0xb2a489][Math.floor(random() * 5)]; const prev = fineMode; fineMode = true; box('people', x, y + 0.95 * scale, z, 0.44 * scale, 0.85 * scale, 0.28 * scale, angle, color); put('skin', 'sphere', x, y + 1.58 * scale, z, 0.18 * scale, 0.22 * scale, 0.18 * scale); box('dark', x - 0.12 * scale, y + 0.33 * scale, z, 0.12 * scale, 0.65 * scale, 0.14 * scale, angle); box('dark', x + 0.12 * scale, y + 0.33 * scale, z, 0.12 * scale, 0.65 * scale, 0.14 * scale, angle); fineMode = prev; }

  const heights = atlasHeights(), height = (i, j) => heights.get(i + ',' + j) || 0;
  let moduleCount = 0, maxHeight = 0, terraces = 0;
  // Bâtiment : modules vitrés, cadres, jardins, garde-corps.
  for (let i = 0; i < NX; i++) for (let j = 0; j < NZ; j++) {
    const h = height(i, j); if (!h) continue;
    const x = (i - (NX - 1) / 2) * CELL, z = (j - (NZ - 1) / 2) * CELL;
    box('concrete', x, 18.25, z, 9, 1.5, 9); box('dark', x, 17.43, z, 8.86, 0.16, 8.86);
    if ((i + j) % 3 === 0) box('warm', x, 17.31, z, 5.4, 0.08, 0.15);
    for (let k = 0; k < h; k++) {
      const y = BASE + k * FLOOR; moduleCount++; maxHeight = Math.max(maxHeight, y + FLOOR);
      const exposed = [height(i + 1, j) <= k, height(i - 1, j) <= k, height(i, j + 1) <= k, height(i, j - 1) <= k];
      if (exposed.some(Boolean)) {
        const tint = new THREE.Color().setHSL(0.44 + random() * 0.035, 0.08 + random() * 0.07, 0.49 + random() * 0.14);
        box('glass', x, y + FLOOR * 0.5, z, 8.82, FLOOR - 0.34, 8.82, 0, tint);
        box('frame', x, y + 0.12, z, 9, 0.24, 9);
        fineMode = true;
        for (const dx of [-4.44, 4.44]) for (const dz of [-4.44, 4.44]) box('frame', x + dx, y + 2.1, z + dz, 0.13, 4, 0.13);
        if (exposed[0]) box('frame', x + 4.45, y + 2.1, z, 0.1, 4, 0.12);
        if (exposed[1]) box('frame', x - 4.45, y + 2.1, z, 0.1, 4, 0.12);
        if (exposed[2]) box('frame', x, y + 2.1, z + 4.45, 0.12, 4, 0.1);
        if (exposed[3]) box('frame', x, y + 2.1, z - 4.45, 0.12, 4, 0.1);
        fineMode = false;
        if (random() < 0.14) { if (exposed[2]) box('warm', x + 1.3, y + 2, z + 4.425, 2.5, 2.4, 0.06); else if (exposed[0]) box('warm', x + 4.425, y + 2, z + 1.3, 0.06, 2.4, 2.5); }
      }
    }
    const roof = BASE + h * FLOOR;
    box('frame', x, roof, z, 9, 0.3, 9); box('soil', x, roof + 0.25, z, 7.7, 0.22, 7.7); box('grass', x - 1.5, roof + 0.4, z - 0.8, 3.8, 0.14, 5.8); box('paving', x + 2.25, roof + 0.41, z, 2.6, 0.16, 7.2);
    terraces++;
    if (random() < 0.82) tree(x - 1.8, roof + 0.46, z - 1.2, 0.75 + random() * 0.38);
    for (const [di, dj, rx, rz, rot] of [[1, 0, 4.35, 0, Math.PI / 2], [-1, 0, -4.35, 0, Math.PI / 2], [0, 1, 0, 4.35, 0], [0, -1, 0, -4.35, 0]]) {
      if (height(i + di, j + dj) >= h) continue;
      fineMode = true;
      box('frame', x + rx, roof + 1.23, z + rz, 8.75, 0.07, 0.07, rot); box('frame', x + rx, roof + 0.7, z + rz, 8.75, 0.035, 0.035, rot);
      for (const end of [-3.8, 0, 3.8]) box('frame', x + rx + (rot ? 0 : end), roof + 0.67, z + rz + (rot ? end : 0), 0.065, 1.05, 0.065);
      fineMode = false;
      if (random() < 0.55) { box('frame', x + rx * 0.87, roof + 0.55, z + rz * 0.87, 5.9, 0.75, 0.75, rot); box('leaf3', x + rx * 0.87, roof + 1.06, z + rz * 0.87, 5.7, 0.36, 0.72, rot); }
    }
    if (random() < 0.035) { for (const dx of [-2.6, 2.6]) for (const dz of [-2.6, 2.6]) box('bronze', x + dx, roof + 1.7, z + dz, 0.12, 3.3, 0.12); for (let q = -3; q <= 3; q++) box('bronze', x, roof + 3.4, z + q * 0.86, 5.8, 0.15, 0.14); }
    if (random() < 0.16) person(x + 2.2, roof + 0.5, z + 1.3, 1, random() * 6);
  }

  // Pilotis ramifiés : environ 17,5 m libres sous la structure.
  for (const x of [-126, -81, -36, 36, 81, 126]) for (const z of [-76.5, 76.5]) { box('concrete', x, 0.25, z, 5.4, 0.5, 5.4); beam('concrete', [x, 0.5, z], [x, 7.5, z], 1.05); beam('concrete', [x, 6.5, z], [x - 8, 17.5, z], 0.94); beam('concrete', [x, 6.5, z], [x + 8, 17.5, z], 0.94); beam('concrete', [x, 9, z], [x, 17.5, z + 6], 0.75); }
  for (const x of [-139.5, 139.5]) for (const z of [-40.5, 40.5]) { beam('concrete', [x, 0, z], [x, 8, z], 1.1); beam('concrete', [x, 7, z], [x, 17.5, z - 7], 0.95); beam('concrete', [x, 7, z], [x, 17.5, z + 7], 0.95); }
  // Noyaux de circulation verticale.
  for (const x of [-108, 108]) for (const z of [-58.5, 58.5]) { box('concrete', x, 9, z, 7, 18, 10); box('glass', x + 3.56, 9, z, 0.18, 17.6, 9); for (let l = 1; l < 5; l++) box('frame', x + 3.68, l * 3.6, z, 0.1, 0.12, 9); box('bronze', x, 1.4, z + 5.03, 2.4, 2.8, 0.1); }
  for (const z of [-76.5, 76.5]) box('concrete', 0, 17.4, z, 288, 1.4, 2.4);
  for (const x of [-135, 135]) box('concrete', x, 17.4, 0, 2.4, 1.4, 171);

  // Sol public (parvis recadré à 336 × 244 m) et grands axes piétons traversants.
  box('paving', 0, -0.42, 0, 336, 0.8, 244);
  for (let x = -162; x <= 162; x += 9) box('joint', x, 0.003, 0, 0.035, 0.016, 240);
  for (let z = -117; z <= 117; z += 9) box('joint', 0, 0.004, z, 332, 0.018, 0.035);
  box('frame', 0, 0.02, 0, 336, 0.035, 22); box('frame', 0, 0.025, 0, 22, 0.04, 244);
  for (const x of [-42, 42]) for (const z of [-20, 20]) { box('concrete', x, 0.3, z, 35, 0.6, 15); box('grass', x, 0.64, z, 34, 0.08, 14); for (let n = 0; n < 4; n++) tree(x - 12 + n * 8, 0.7, z + (n % 2 ? 2 : -2), 1.5 + random() * 0.45); box('bronze', x, 0.95, z + 7.5, 25, 0.25, 0.9); }
  // Bassin.
  box('concrete', -93, 0.3, 112, 72, 0.6, 15); box('water', -93, 0.63, 112, 70, 0.05, 13);
  for (let n = 0; n < 14; n++) put('frame', 'cyl', -127 + n * 5, 0.8, 112, 0.08, 0.35, 0.08);
  // Arbres et bancs du boulevard.
  for (const z of [-115, 115]) for (let x = -166; x <= 166; x += 22) { if (Math.abs(x) < 18 || (z > 0 && x < -50)) continue; const xx = Math.max(-160, Math.min(160, x)); box('concrete', xx, 0.25, z, 5, 0.5, 5); box('grass', xx, 0.55, z, 4.7, 0.12, 4.7); tree(xx, 0.6, z, 1.75); box('bronze', xx + (xx > 0 ? -5 : 5), 0.7, z, 3, 0.3, 1); }
  for (const x of [-163, 163]) for (const z of [-90, -60, -30, 30, 60, 90]) tree(x, 0.1, z, 1.55);
  // Piétons pour l'échelle.
  for (let n = 0; n < 155; n++) { let x, z; if (n < 75) { x = (random() - 0.5) * 320; z = (random() - 0.5) * 18; } else if (n < 115) { x = (random() - 0.5) * 16; z = (random() - 0.5) * 230; } else { x = (random() - 0.5) * 320; z = (random() < 0.5 ? -1 : 1) * (103 + random() * 15); } person(x, 0.08, z, 1 + random() * 0.12, random() * 6); }
  // Escaliers vers le socle.
  for (const [sx, sz, sign] of [[-115, -91, -1], [115, 91, 1]]) { for (let n = 0; n < 38; n++) { const z = sz + sign * (38 - n) * 0.8; box('concrete', sx, (n + 1) * 0.25, z, 13, (n + 1) * 0.5, 0.82); } for (const dx of [-6.8, 6.8]) beam('bronze', [sx + dx, 1, sz + sign * 31], [sx + dx, 20, sz], 0.075); }

  // Construction des groupes d'instances.
  for (const { mat, geo, fine: isFine, items } of batches.values()) {
    const geometry = geo === 'box' ? boxGeo : geo === 'sphere' ? sphereGeo : cylGeo;
    const mesh = new THREE.InstancedMesh(geometry, materials[mat], items.length); mesh.name = mat + ' / ' + geo;
    mesh.castShadow = !['water', 'joint', 'warm', 'people', 'skin'].includes(mat); mesh.receiveShadow = true;
    for (let n = 0; n < items.length; n++) { const t = items[n]; dummy.position.set(t.x, t.y, t.z); dummy.scale.set(t.sx, t.sy, t.sz); if (t.quat) dummy.quaternion.copy(t.quat); else dummy.rotation.set(0, t.ry, 0); dummy.updateMatrix(); mesh.setMatrixAt(n, dummy.matrix); if (t.color !== null) mesh.setColorAt(n, t.color instanceof THREE.Color ? t.color : new THREE.Color(t.color)); }
    mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; mesh.computeBoundingSphere();
    (isFine ? fine : root).add(mesh);
  }

  let lastX = Infinity, lastZ = Infinity;
  return {
    root,
    statistics: { modules: moduleCount, hauteur: Math.round(maxHeight), terrasses: terraces },
    update(position) { if ((position.x - lastX) ** 2 + (position.z - lastZ) ** 2 < 100) return; lastX = position.x; lastZ = position.z; fine.visible = Math.hypot(position.x - ATLAS.x, position.z - ATLAS.z) < FINE_DISTANCE + 160; },
    setNight(on) { materials.warm.emissiveIntensity = on ? 2.8 : 0.12; materials.glass.color.setHex(on ? 0x789e9a : 0x94b8b1); },
    dispose() { root.removeFromParent(); root.traverse(o => { if (o.isInstancedMesh) o.dispose(); }); for (const d of disposables) d.dispose?.(); },
  };
}
