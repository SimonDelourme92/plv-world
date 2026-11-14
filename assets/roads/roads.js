import { createRoadNetwork } from './network.js';

function ribbon(THREE, points, width, heightAt) {
  const positions = [], indices = [];
  for (let i = 0; i < points.length; i++) {
    const p = points[i], before = points[Math.max(0, i - 1)], after = points[Math.min(points.length - 1, i + 1)];
    const dx = after.x - before.x, dz = after.z - before.z, length = Math.hypot(dx, dz) || 1;
    const nx = -dz / length, nz = dx / length, y = heightAt(p.x, p.z) + 0.035;
    positions.push(p.x + nx * width * .5, y, p.z + nz * width * .5, p.x - nx * width * .5, y, p.z - nz * width * .5);
    if (i) { const j = (i - 1) * 2; indices.push(j, j + 1, j + 2, j + 1, j + 3, j + 2); }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  return geometry;
}

export function createRoads({ THREE, scene, heightAt, reservations = [], water = () => false }) {
  const root = new THREE.Group(); root.name = 'Routes sinueuses'; scene.add(root);
  const asphalt = new THREE.MeshStandardMaterial({ color: 0x343d42, roughness: .92, metalness: .02 });
  const shoulder = new THREE.MeshStandardMaterial({ color: 0x8d806c, roughness: 1 });
  const network = createRoadNetwork({ reservations, water });
  for (const road of network.roads) {
    const mesh = new THREE.Mesh(ribbon(THREE, road.points, road.width, heightAt), asphalt);
    mesh.receiveShadow = true; root.add(mesh);
    const outer = new THREE.Mesh(ribbon(THREE, road.points, road.width + 1.8, heightAt), shoulder);
    outer.position.y -= .018; outer.renderOrder = -1; outer.receiveShadow = true; root.add(outer);
  }
  const lampGeometry = new THREE.CylinderGeometry(.055, .08, 3.4, 8);
  lampGeometry.translate(0, 1.7, 0);
  const lampMaterial = new THREE.MeshStandardMaterial({ color: 0x273238, roughness: .7, metalness: .35 });
  const lamps = new THREE.InstancedMesh(lampGeometry, lampMaterial, 48);
  const lampDummy = new THREE.Object3D(); let lampCount = 0;
  for (const road of network.roads.slice(0, 1)) for (let i = 1; i < road.points.length; i++) {
    const a = road.points[i - 1], b = road.points[i], length = Math.hypot(b.x - a.x, b.z - a.z);
    const count = Math.max(1, Math.floor(length / 34));
    for (let k = 0; k < count && lampCount < lamps.count; k++) {
      const t = (k + .5) / count, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
      if ((i + k) % 3 === 0) continue;
      const side = (i + k) % 2 ? 1 : -1, dx = (b.x - a.x) / (length || 1), dz = (b.z - a.z) / (length || 1);
      lampDummy.position.set(x - dz * side * 5, heightAt(x, z), z + dx * side * 5); lampDummy.rotation.y = Math.atan2(dx, dz); lampDummy.updateMatrix(); lamps.setMatrixAt(lampCount++, lampDummy.matrix);
    }
  }
  lamps.count = lampCount; lamps.castShadow = false; root.add(lamps);
  // Un pont léger est posé au premier point du réseau qui traverse la zone humide.
  for (const road of network.roads) for (let i = 1; i < road.points.length; i++) {
    const a = road.points[i - 1], b = road.points[i];
    if (!water((a.x + b.x) * .5, (a.z + b.z) * .5)) continue;
    const length = Math.hypot(b.x - a.x, b.z - a.z), bridge = new THREE.Mesh(new THREE.BoxGeometry(length, .28, road.width + .8), asphalt);
    bridge.position.set((a.x + b.x) * .5, Math.max(heightAt(a.x, a.z), heightAt(b.x, b.z)) + .18, (a.z + b.z) * .5); bridge.rotation.y = Math.atan2(b.z - a.z, b.x - a.x); bridge.receiveShadow = true; root.add(bridge); break;
  }
  return { root, network, statistics: { routesKm: network.roads.reduce((sum, r) => sum + r.points.slice(1).reduce((s, p, i) => s + Math.hypot(p.x - r.points[i].x, p.z - r.points[i].z), 0), 0) / 1000 } };
}
