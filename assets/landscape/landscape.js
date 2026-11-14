import { AssetLibrary } from "../library/manager.js";
import { createPlantingPlan } from "./plan.js";
export async function createLandscape({ THREE, scene, onChange = () => {} }) {
  const library = new AssetLibrary(),
    plan = createPlantingPlan(),
    root = new THREE.Group();
  root.name = "Jardins et pavillons GLB";
  const ids = [...new Set(plan.map((p) => p.id))],
    resources = [],
    geometries = [],
    meshes = [],
    chunks = [];
  let disposed = false,
    lastTick = -Infinity;
  try {
    const results = await Promise.allSettled(
      ids.flatMap((id) => [0, 1].map((lod) => library.acquire(id, lod))),
    );
    for (const r of results)
      if (r.status === "fulfilled") resources.push(r.value);
    if (results.some((r) => r.status === "rejected"))
      throw Error("Chargement des jardins incomplet");
    const carrier = new THREE.Object3D();
    for (const resource of resources) {
      const parts = [];
      resource.scene.updateMatrixWorld(true);
      resource.scene.traverse((source) => {
        if (!source.isMesh) return;
        const geometry = source.geometry.clone();
        geometries.push(geometry);
        for (const key of ["position", "normal", "tangent"]) {
          const a = geometry.getAttribute(key);
          if (!a) continue;
          const values = new Float32Array(a.count * a.itemSize);
          for (let i = 0; i < a.count; i++)
            for (let c = 0; c < a.itemSize; c++)
              values[i * a.itemSize + c] = a.getComponent(i, c);
          geometry.setAttribute(
            key,
            new THREE.BufferAttribute(values, a.itemSize),
          );
        }
        geometry.applyMatrix4(source.matrixWorld);
        parts.push({ geometry, material: source.material });
      });
      const zones = new Map();
      for (const p of plan.filter((p) => p.id === resource.asset.id)) {
        const key =
          p.zone === "central"
            ? "central"
            : Math.floor(p.x / 100) + ":" + Math.floor(p.z / 100);
        if (!zones.has(key)) zones.set(key, []);
        zones.get(key).push(p);
      }
      for (const points of zones.values()) {
        const group = new THREE.Group();
        group.visible = false;
        root.add(group);
        const cx = points.reduce((s, p) => s + p.x, 0) / points.length,
          cz = points.reduce((s, p) => s + p.z, 0) / points.length;
        for (const part of parts) {
          const mesh = new THREE.InstancedMesh(
            part.geometry,
            part.material,
            points.length,
          );
          meshes.push(mesh);
          points.forEach((p, i) => {
            carrier.position.set(p.x, p.y, p.z);
            carrier.rotation.set(0, p.rotation, 0);
            carrier.scale.setScalar(p.scale);
            carrier.updateMatrix();
            mesh.setMatrixAt(i, carrier.matrix);
          });
          mesh.instanceMatrix.needsUpdate = true;
          mesh.computeBoundingSphere();
          mesh.computeBoundingBox();
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          group.add(mesh);
        }
        chunks.push({
          group,
          cx,
          cz,
          lod: resource.lod.level,
          central: points[0].zone === "central",
        });
      }
    }
    scene.add(root);
    onChange();
    return {
      root,
      plan,
      collisions: plan
        .filter(
          (p) =>
            p.id.includes("pavillon") ||
            p.id === "hangar-vitre" ||
            p.id === "pin" ||
            p.id === "arbre-feuillu",
        )
        .map((p) =>
          p.id === "pin" || p.id === "arbre-feuillu"
            ? {
                min: { x: p.x - 0.18, y: 0, z: p.z - 0.18 },
                max: { x: p.x + 0.18, y: 2.5, z: p.z + 0.18 },
              }
            : p.bounds,
        ),
      update(camera, quality, map, density, now, force = false) {
        if (disposed || (!force && now - lastTick < 200)) return;
        lastTick = now;
        root.visible = density !== "off";
        const near = quality === "high" ? 85 : quality === "low" ? 0 : 55,
          far = quality === "high" ? 350 : quality === "low" ? 140 : 240;
        for (const c of chunks) {
          const distance = Math.hypot(
            camera.position.x - c.cx,
            camera.position.z - c.cz,
          );
          c.group.visible = map
            ? c.central && c.lod === 1
            : distance < far && c.lod === (distance < near ? 0 : 1);
        }
      },
      get statistics() {
        return {
          instances: plan.length,
          chunks: chunks.length,
          visibleChunks: chunks.filter((c) => c.group.visible).length,
          ...library.statistics,
        };
      },
      dispose() {
        if (disposed) return;
        disposed = true;
        root.removeFromParent();
        meshes.forEach((m) => m.dispose());
        geometries.forEach((g) => g.dispose());
        resources.forEach((r) => r.release());
        library.dispose();
      },
    };
  } catch (error) {
    root.removeFromParent();
    meshes.forEach((m) => m.dispose());
    geometries.forEach((g) => g.dispose());
    resources.forEach((r) => r.release());
    library.dispose();
    throw error;
  }
}
