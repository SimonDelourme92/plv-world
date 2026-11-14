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
  return { root, network, statistics: { routesKm: network.roads.reduce((sum, r) => sum + r.points.slice(1).reduce((s, p, i) => s + Math.hypot(p.x - r.points[i].x, p.z - r.points[i].z), 0), 0) / 1000 } };
}
