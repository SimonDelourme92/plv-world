// Adaptateur d'affichage : les décors ne rejoignent jamais les lots ni les collisions.
const IDS = [
  "tour-a",
  "tour-c",
  "tour-e",
  "relief-montagne",
  "avion-a320",
  "evtol",
  "drone",
  "navette-cargo",
];
export async function buildModelHorizon(THREE, library) {
  const acquired = await Promise.allSettled(
    IDS.map((id) => library.acquire(id, 1)),
  );
  if (acquired.some((r) => r.status === "rejected")) {
    for (const r of acquired) if (r.status === "fulfilled") r.value.release();
    throw Error("Un modèle de l’horizon est indisponible");
  }
  const resources = acquired.map((r) => r.value),
    root = new THREE.Group(),
    ownedGeometries = [],
    ownedMaterials = [],
    instanceMeshes = [],
    records = new Map();
  root.name = "Horizon GLB · bibliothèque";
  const carrier = new THREE.Object3D(),
    hazeDay = new THREE.Color("#abc1d1"),
    hazeNight = new THREE.Color("#536a81");
  let quality = null,
    night = null;
  let disposed = false;
  function cleanup() {
    if (disposed) return;
    disposed = true;
    root.removeFromParent();
    instanceMeshes.forEach((m) => m.dispose());
    ownedGeometries.forEach((g) => g.dispose());
    ownedMaterials.forEach((m) => m.dispose());
    resources.forEach((r) => r.release());
  }
  try {
    for (let k = 0; k < resources.length; k++) {
      const r = resources[k],
        parts = [];
      r.scene.updateMatrixWorld(true);
      r.scene.traverse((source) => {
        if (!source.isMesh) return;
        if (Array.isArray(source.material))
          throw Error("Matériau multiple non préparé : " + r.asset.id);
        const geometry = source.geometry.clone();
        // Déquantification CPU avant de cuire les transformations du glTF.
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
        geometry.computeBoundingBox();
        geometry.computeBoundingSphere();
        ownedGeometries.push(geometry);
        const original = source.material,
          base = original.color.clone();
        const material = new THREE.MeshBasicMaterial({
          map: original.map,
          color: base,
          vertexColors: original.vertexColors,
          side: original.side,
          alphaTest: original.alphaTest,
          fog: false,
          depthWrite: false,
          depthTest: false,
        });
        material.userData.base = base;
        material.onBeforeCompile = (shader) => {
          shader.vertexShader = shader.vertexShader.replace(
            "#include <project_vertex>",
            "#include <project_vertex>\n gl_Position.z=gl_Position.w*0.9999;",
          );
        };
        material.customProgramCacheKey = () => "plv-library-horizon-v1";
        ownedMaterials.push(material);
        parts.push({ geometry, material });
      });
      records.set(r.asset.id, { resource: r, parts, meshes: [] });
    }
    function instances(id, count) {
      const record = records.get(id);
      for (const p of record.parts) {
        const mesh = new THREE.InstancedMesh(p.geometry, p.material, count);
        mesh.frustumCulled = false;
        mesh.renderOrder =
          id === "relief-montagne"
            ? -8400
            : id.startsWith("tour-")
              ? -8200
              : -7800;
        mesh.instanceMatrix.setUsage(
          id.startsWith("tour-") || id === "relief-montagne"
            ? THREE.StaticDrawUsage
            : THREE.DynamicDrawUsage,
        );
        root.add(mesh);
        instanceMeshes.push(mesh);
        record.meshes.push(mesh);
      }
      return record;
    }
    const towers = ["tour-a", "tour-c", "tour-e"].map((id) =>
      instances(id, 32),
    );
    for (let type = 0; type < towers.length; type++)
      for (let i = 0; i < 32; i++) {
        // Les 24 premiers groupes couvrent tout l'horizon ; Haute ajoute des silhouettes.
        const slot =
            i < 24 ? ((i * 7) % 24) * 3 + type : 72 + (i - 24) * 3 + type,
          a = (slot / (i < 24 ? 72 : 96)) * Math.PI * 2,
          radius = 1790 + (slot % 5) * 38,
          height = 0.7 + (slot % 7) * 0.07;
        carrier.position.set(Math.cos(a) * radius, -9, Math.sin(a) * radius);
        carrier.rotation.set(0, -a, 0);
        carrier.scale.set(0.8, height, 0.8);
        carrier.updateMatrix();
        for (const mesh of towers[type].meshes)
          mesh.setMatrixAt(i, carrier.matrix);
      }
    const mountain = instances("relief-montagne", 24);
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      carrier.position.set(Math.cos(a) * 2320, -55, Math.sin(a) * 2320);
      carrier.rotation.set(0, -a - Math.PI / 2, 0);
      carrier.scale.set(2.45, 0.7 + (i % 5) * 0.13, 2.0);
      carrier.updateMatrix();
      for (const mesh of mountain.meshes) mesh.setMatrixAt(i, carrier.matrix);
    }
    const flights = [
      instances("avion-a320", 2),
      instances("evtol", 2),
      instances("drone", 1),
      instances("navette-cargo", 1),
    ];
    const slots = [[0, 5], [1, 4], [2], [3]],
      phases = [0.4, 1.5, 2.7, 3.8, 4.9, 5.8];
    for (const mesh of instanceMeshes) mesh.instanceMatrix.needsUpdate = true;
    function update(now, nextQuality, hour) {
      const low = nextQuality === "low",
        nextNight = hour < 8.5 || hour >= 19;
      if (nextQuality !== quality) {
        for (const t of towers)
          for (const m of t.meshes)
            m.count = low ? 12 : nextQuality === "high" ? 32 : 24;
        for (const m of mountain.meshes) m.count = low ? 12 : 24;
        for (let i = 0; i < flights.length; i++)
          for (const m of flights[i].meshes) {
            let count = 0;
            for (const n of slots[i]) if (!low || n < 2) count++;
            m.count = count;
            m.visible = m.count > 0;
          }
        quality = nextQuality;
      }
      if (night !== nextNight) {
        for (const m of ownedMaterials)
          m.color
            .copy(m.userData.base)
            .lerp(nextNight ? hazeNight : hazeDay, nextNight ? 0.78 : 0.3);
        night = nextNight;
      }
      const t = now * 0.000018;
      for (let type = 0; type < flights.length; type++) {
        let index = 0;
        for (const i of slots[type]) {
          if (low && i >= 2) continue;
          const a = phases[i] + t * (i % 2 ? -0.7 : 1),
            radius = 840 + i * 90,
            y = 145 + i * 23 + Math.sin(a * 2) * 12;
          carrier.position.set(
            50 + Math.cos(a) * radius,
            y,
            50 + Math.sin(a) * radius,
          );
          carrier.rotation.set(
            0.025,
            -a +
              (i % 2 ? Math.PI : 0) +
              (flights[type].resource.asset.forwardAxis === "-Z" ? Math.PI : 0),
            Math.sin(a) * 0.07,
          );
          const s = type === 2 ? 1.7 : type === 1 ? 1.3 : 1;
          carrier.scale.setScalar(s);
          carrier.updateMatrix();
          for (const mesh of flights[type].meshes)
            mesh.setMatrixAt(index, carrier.matrix);
          index++;
        }
        for (const mesh of flights[type].meshes)
          mesh.instanceMatrix.needsUpdate = true;
      }
    }
    return {
      root,
      update,
      get drawCalls() {
        let count = 0;
        for (const m of instanceMeshes) if (m.visible && m.count > 0) count++;
        return count;
      },
      dispose: cleanup,
    };
  } catch (error) {
    cleanup();
    throw error;
  }
}
