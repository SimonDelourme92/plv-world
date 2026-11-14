import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { scatterNature } from './scatter.js';

export async function createNature({ THREE, scene, terrainHeight, reservations = [], routes = [], water = () => false, density = 'medium' }) {
  const root = new THREE.Group(); root.name = 'Végétation naturelle'; scene.add(root);
  const loader = new GLTFLoader(), names = ['arbre-feuillu', 'pin', 'buisson'], models = await Promise.all(names.map(n => loader.loadAsync(new URL(`../library/models/vegetation/${n}.lod0.glb`, import.meta.url).href)));
  const groups = models.map(m => { const g = new THREE.Group(); m.scene.traverse(o => { if (o.isMesh) { const inst = new THREE.InstancedMesh(o.geometry, o.material, 1); g.add(inst); } }); root.add(g); return g; });
  const items = scatterNature({ reservations, routes, water, density });
  const bySpecies = groups.map((_, species) => items.filter(item => item.species % 3 === species));
  for (let species = 0; species < groups.length; species++) {
    const meshes = groups[species].children;
    for (const mesh of meshes) {
      mesh.instanceMatrix = new THREE.InstancedBufferAttribute(new Float32Array(Math.max(1, bySpecies[species].length) * 16), 16);
      mesh.count = bySpecies[species].length; const dummy = new THREE.Object3D();
      bySpecies[species].forEach((item, i) => { dummy.position.set(item.x, terrainHeight(item.x, item.z), item.z); dummy.rotation.y = item.rotation; dummy.scale.setScalar(item.scale); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix); });
      mesh.instanceMatrix.needsUpdate = true; mesh.castShadow = species !== 2; mesh.receiveShadow = true;
    }
  }
  const grid = new Map(), cellSize = 10;
  for (const item of items) {
    if (item.species % 3 === 2) continue;
    const cx = Math.floor(item.x / cellSize), cz = Math.floor(item.z / cellSize);
    const key = `${cx},${cz}`;
    if (!grid.has(key)) grid.set(key, []);
    grid.get(key).push(item);
  }
  function collides(x, z, radius = .4) {
    const cx = Math.floor(x / cellSize), cz = Math.floor(z / cellSize);
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++)
      for (const item of grid.get(`${cx + dx},${cz + dz}`) || [])
        if (Math.hypot(item.x - x, item.z - z) < radius + .22 * item.scale) return true;
    return false;
  }
  return { root, collides, statistics: { arbres: items.length, especes: 3 }, update() {}, refresh() {} };
}
