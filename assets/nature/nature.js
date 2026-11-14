// Végétation du paysage : modèles détaillés (CC0 Quaternius) près de la caméra,
// silhouettes légères au loin, rien au-delà de la distance d'affichage.
// Les listes d'instances sont reconstruites quand la caméra s'est déplacée de quelques mètres.
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { scatterNature, SPECIES } from './scatter.js';

const TILE = 64;
// Feuillages du pack prévus pour un shader stylisé : la texture ne sert qu'à découper la silhouette,
// la couleur est fixée ici (le buisson commun réutilise les feuilles rouges de l'arbre tordu).
const LEAF_TINT = { 'buisson': { Leaves_TwistedTree: 0x55823a }, 'arbre-tordu': { Leaves_TwistedTree: 0xa9542c }, 'arbre-tordu-large': { Leaves_TwistedTree: 0x86933a } };
function alphaOnly(material, color) {
  material.color.set(color);
  material.onBeforeCompile = shader => { shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', '#ifdef USE_MAP\n\tdiffuseColor.a *= texture2D( map, vMapUv ).a;\n#endif'); };
  material.customProgramCacheKey = () => 'feuillage-silhouette';
  material.needsUpdate = true;
}
// Rayons d'affichage détaillé selon la densité (m) ; les petites plantes disparaissent plus tôt.
const NEAR = { low: 65, medium: 90, high: 120 }, SMALL = { low: 40, medium: 55, high: 70 };
// Couleurs des silhouettes lointaines (tronc, houppier).
const FAR_STYLE = {
  'arbre-feuillu': ['round', 0x5b4632, 0x5f8a3c], 'feuillu-rond': ['round', 0x5b4632, 0x6f9440], 'feuillu-eleve': ['tall', 0x5b4632, 0x58833a],
  'pin': ['cone', 0x4d3b2b, 0x2f5a3a], 'pin-touffu': ['cone', 0x4d3b2b, 0x36603c], 'arbre-tordu': ['wide', 0x5a4a3a, 0xa9542c],
  'arbre-tordu-large': ['wide', 0x5a4a3a, 0x86933a], 'arbre-mort': ['dead', 0x6b6158, 0x6b6158], 'rocher-moyen': ['rock', 0x8b8a84, 0x8b8a84], 'rocher-plat': ['rock', 0x8f8c84, 0x8f8c84],
};

function farGeometry(THREE, style, dims) {
  const [kind, trunkColor, crownColor] = style, [w, h, d] = dims, parts = [];
  const add = (geo, color) => { const c = new THREE.Color(color), n = geo.attributes.position.count, col = new Float32Array(n * 3); for (let i = 0; i < n; i++) c.toArray(col, i * 3); geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); parts.push(geo.index ? geo.toNonIndexed() : geo); };
  const trunk = (r, top) => { const g = new THREE.CylinderGeometry(r * 0.7, r, top, 5); g.translate(0, top / 2, 0); add(g, trunkColor); };
  if (kind === 'rock') { const g = new THREE.DodecahedronGeometry(0.5, 0); g.scale(w, h * 1.6, d); g.translate(0, h * 0.35, 0); add(g, crownColor); }
  else if (kind === 'cone') { trunk(w * 0.05, h * 0.3); const g = new THREE.ConeGeometry(Math.max(w, d) * 0.46, h * 0.82, 7); g.translate(0, h * 0.18 + h * 0.41, 0); add(g, crownColor); }
  else if (kind === 'dead') { const g = new THREE.CylinderGeometry(w * 0.02, w * 0.06, h * 0.95, 5); g.translate(0, h * 0.475, 0); add(g, trunkColor); const b = new THREE.ConeGeometry(w * 0.3, h * 0.45, 5, 1, true); b.translate(0, h * 0.7, 0); add(b, trunkColor); }
  else {
    const tall = kind === 'tall', wide = kind === 'wide';
    trunk(w * (wide ? 0.07 : 0.06), h * (tall ? 0.45 : 0.5));
    const g = new THREE.IcosahedronGeometry(0.5, 1);
    g.scale(w * (wide ? 0.95 : 0.85), h * (tall ? 0.72 : wide ? 0.42 : 0.6), d * (wide ? 0.95 : 0.85));
    g.translate(0, h * (tall ? 0.6 : wide ? 0.72 : 0.64), 0); add(g, crownColor);
  }
  const pos = [], col = [];
  for (const p of parts) { pos.push(...p.attributes.position.array); col.push(...p.attributes.color.array); p.dispose(); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals(); return g;
}

export async function createNature({ THREE, scene, heightAt, city, isWater, bankDepth, roadDistance, obstacles = [], boulevard = [], density = 'medium', viewDistance = () => 350, baseUrl }) {
  const root = new THREE.Group(); root.name = 'Végétation'; scene.add(root);
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const base = baseUrl || new URL('../library/models/vegetation/', import.meta.url).href;
  const farMat = new THREE.MeshLambertMaterial({ vertexColors: true });
  // Chargement des espèces (une erreur sur l'une n'empêche pas les autres).
  const kinds = await Promise.all(SPECIES.map(async def => {
    try {
      const gltf = await loader.loadAsync(base + def.id + '.lod0.glb');
      gltf.scene.updateMatrixWorld(true);
      const parts = [], box = new THREE.Box3().setFromObject(gltf.scene), size = box.getSize(new THREE.Vector3());
      gltf.scene.traverse(o => {
        if (!o.isMesh) return;
        const geo = o.geometry.clone().applyMatrix4(o.matrixWorld);
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats) { if (m.map) m.map.anisotropy = 4; const tint = LEAF_TINT[def.id]?.[m.name]; if (tint != null && !m.userData.tinted) { alphaOnly(m, tint); m.userData.tinted = true; } }
        parts.push({ geo, mat: o.material });
      });
      const style = FAR_STYLE[def.id];
      return { def, parts, size, far: style ? farGeometry(THREE, style, [size.x, size.y, size.z]) : null };
    } catch (e) { console.warn('Espèce indisponible : ' + def.id, e); return null; }
  }));
  // Maillages instanciés : un par partie (proche) et un par espèce (loin). Capacité ajustée au besoin.
  const near = kinds.map(k => k ? k.parts.map(p => ({ ...p, mesh: null, cap: 0 })) : []);
  const far = kinds.map(k => k?.far ? { geo: k.far, mesh: null, cap: 0 } : null);
  const ensure = (slot, need, geo, mat, shadow) => {
    if (slot.mesh && slot.cap >= need) return slot.mesh;
    if (slot.mesh) { slot.mesh.removeFromParent(); slot.mesh.dispose(); }
    slot.cap = Math.max(64, Math.ceil(need * 1.4));
    slot.mesh = new THREE.InstancedMesh(geo, mat, slot.cap);
    slot.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    slot.mesh.frustumCulled = false; slot.mesh.castShadow = shadow; slot.mesh.receiveShadow = true; slot.mesh.count = 0;
    root.add(slot.mesh); return slot.mesh;
  };

  let items = null, matrices = null, hidden = null, tiles = new Map(), trunks = new Map(), level = density;
  let lastX = Infinity, lastZ = Infinity, dirty = true, lots = [];
  const stats = { total: 0, proches: 0, lointains: 0, especes: kinds.filter(Boolean).length };
  const tmp = new THREE.Object3D();
  function build(nextDensity) {
    level = nextDensity;
    items = scatterNature({ density: level, city, isWater, bankDepth, roadDistance, obstacles, boulevard });
    matrices = new Float32Array(items.count * 16); hidden = new Uint8Array(items.count); tiles = new Map(); trunks = new Map();
    for (let i = 0; i < items.count; i++) {
      const x = items.x[i], z = items.z[i], s = items.scale[i], def = SPECIES[items.species[i]];
      // Pied légèrement enterré : le plus bas des quatre points autour du tronc.
      const r = 0.6 * s, y = Math.min(heightAt(x, z), heightAt(x + r, z), heightAt(x - r, z), heightAt(x, z + r), heightAt(x, z - r)) - 0.08;
      tmp.position.set(x, y, z); tmp.rotation.set(0, items.rotation[i], 0); tmp.scale.setScalar(s); tmp.updateMatrix();
      tmp.matrix.toArray(matrices, i * 16);
      const key = Math.floor(x / TILE) * 4096 + Math.floor(z / TILE);
      let t = tiles.get(key); if (!t) tiles.set(key, t = []); t.push(i);
      if (def.radius > 0) { const k = Math.floor(x / 8) * 4096 + Math.floor(z / 8); let c = trunks.get(k); if (!c) trunks.set(k, c = []); c.push(i); }
    }
    stats.total = items.count; applyLots(); dirty = true;
  }
  function applyLots() {
    if (!items) return;
    hidden.fill(0);
    for (const b of lots) {
      const x0 = Math.floor((b.min.x - 8) / TILE), x1 = Math.floor((b.max.x + 8) / TILE), z0 = Math.floor((b.min.z - 8) / TILE), z1 = Math.floor((b.max.z + 8) / TILE);
      for (let tx = x0; tx <= x1; tx++) for (let tz = z0; tz <= z1; tz++) for (const i of tiles.get(tx * 4096 + tz) || []) {
        const m = SPECIES[items.species[i]].kind === 'tree' ? 4 : 1.5, x = items.x[i], z = items.z[i];
        if (x > b.min.x - m && x < b.max.x + m && z > b.min.z - m && z < b.max.z + m) hidden[i] = 1;
      }
    }
    dirty = true;
  }
  const buckets = SPECIES.map(() => ({ near: [], far: [] }));
  function rebuild(px, pz) {
    for (const b of buckets) { b.near.length = 0; b.far.length = 0; }
    const nearR = NEAR[level] || NEAR.medium, smallR = SMALL[level] || SMALL.medium, farR = Math.min(700, viewDistance());
    const t0x = Math.floor((px - farR) / TILE), t1x = Math.floor((px + farR) / TILE), t0z = Math.floor((pz - farR) / TILE), t1z = Math.floor((pz + farR) / TILE);
    for (let tx = t0x; tx <= t1x; tx++) for (let tz = t0z; tz <= t1z; tz++) {
      const list = tiles.get(tx * 4096 + tz); if (!list) continue;
      for (const i of list) {
        if (hidden[i]) continue;
        const sp = items.species[i], kind = SPECIES[sp].kind, dx = items.x[i] - px, dz = items.z[i] - pz, d2 = dx * dx + dz * dz;
        if (kind === 'bush' || kind === 'plant') { if (d2 < smallR * smallR) buckets[sp].near.push(i); }
        else if (d2 < nearR * nearR) buckets[sp].near.push(i);
        else if (d2 < farR * farR) buckets[sp].far.push(i);
      }
    }
    let n = 0, f = 0;
    for (let sp = 0; sp < SPECIES.length; sp++) {
      const k = kinds[sp], b = buckets[sp];
      for (const slot of near[sp]) {
        const mesh = b.near.length || slot.mesh ? ensure(slot, b.near.length, slot.geo, slot.mat, SPECIES[sp].kind === 'tree' || SPECIES[sp].kind === 'rock') : null;
        if (!mesh) continue;
        const arr = mesh.instanceMatrix.array;
        b.near.forEach((i, j) => arr.set(matrices.subarray(i * 16, i * 16 + 16), j * 16));
        mesh.count = b.near.length; mesh.instanceMatrix.needsUpdate = true;
      }
      n += b.near.length;
      const slot = far[sp];
      if (k && slot && (b.far.length || slot.mesh)) {
        const mesh = ensure(slot, b.far.length, slot.geo, farMat, false), arr = mesh.instanceMatrix.array;
        b.far.forEach((i, j) => arr.set(matrices.subarray(i * 16, i * 16 + 16), j * 16));
        mesh.count = b.far.length; mesh.instanceMatrix.needsUpdate = true; f += b.far.length;
      }
    }
    stats.proches = n; stats.lointains = f;
    lastX = px; lastZ = pz; dirty = false;
  }
  build(density);
  root.visible = density !== 'off';

  return {
    root, statistics: stats,
    // Appelé à chaque image avec la position de la caméra active.
    update(position) {
      if (!root.visible || !items) return;
      if (dirty || (position.x - lastX) ** 2 + (position.z - lastZ) ** 2 > 144) rebuild(position.x, position.z);
    },
    // Recalcule l'emprise des lots (ajout, déplacement, suppression) : la végétation s'efface dessous.
    refresh(lotBounds = []) { lots = lotBounds; applyLots(); },
    setDensity(next) { root.visible = next !== 'off'; if (next !== level) build(next); },
    invalidate() { dirty = true; },
    collides(x, z, radius = 0.4) {
      if (!root.visible || !items) return false;
      const cx = Math.floor(x / 8), cz = Math.floor(z / 8);
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) for (const i of trunks.get((cx + dx) * 4096 + cz + dz) || []) {
        if (hidden[i]) continue;
        const r = SPECIES[items.species[i]].radius * (SPECIES[items.species[i]].kind === 'rock' ? items.scale[i] : Math.max(0.8, items.scale[i]));
        if ((items.x[i] - x) ** 2 + (items.z[i] - z) ** 2 < (radius + r) ** 2) return true;
      }
      return false;
    },
    // Boîte orientée de la voiture contre les troncs et rochers.
    collidesCar(x, z, yaw, halfW, halfL) {
      if (!root.visible || !items) return false;
      const c = Math.cos(yaw), s = Math.sin(yaw), cx = Math.floor(x / 8), cz = Math.floor(z / 8);
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) for (const i of trunks.get((cx + dx) * 4096 + cz + dz) || []) {
        if (hidden[i]) continue;
        const def = SPECIES[items.species[i]], r = def.radius * (def.kind === 'rock' ? items.scale[i] : Math.max(0.8, items.scale[i]));
        const ox = items.x[i] - x, oz = items.z[i] - z, lat = c * ox - s * oz, lon = s * ox + c * oz;
        const qx = Math.max(-halfW, Math.min(halfW, lat)), qz = Math.max(-halfL, Math.min(halfL, lon));
        if ((lat - qx) ** 2 + (lon - qz) ** 2 < r * r) return true;
      }
      return false;
    },
    // Carte : densité de végétation en image (1 px = 8 m), dessinée une fois.
    densityImage() {
      if (!items || typeof document === 'undefined') return null;
      const c = document.createElement('canvas'); c.width = c.height = 250; const g = c.getContext('2d'), img = g.createImageData(250, 250), acc = new Uint16Array(250 * 250);
      for (let i = 0; i < items.count; i++) { if (hidden[i] || SPECIES[items.species[i]].kind !== 'tree') continue; const px = Math.floor((items.x[i] + 1000) / 8), pz = Math.floor((items.z[i] + 1000) / 8); if (px >= 0 && pz >= 0 && px < 250 && pz < 250) acc[pz * 250 + px]++; }
      for (let i = 0; i < acc.length; i++) { const a = Math.min(1, acc[i] / 2.2); img.data.set([46, 92, 52, Math.round(a * 200)], i * 4); }
      g.putImageData(img, 0, 0); return c;
    },
    dispose() { root.removeFromParent(); root.traverse(o => { if (o.isInstancedMesh) o.dispose(); }); farMat.dispose(); for (const k of kinds) { k?.far?.dispose(); k?.parts.forEach(p => p.geo.dispose()); } },
  };
}
