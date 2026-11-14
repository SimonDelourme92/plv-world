// Horizon original et indépendant des surfaces d'exposition. Aucun asset externe.
export function createHorizon(THREE, scene) {
  const root = new THREE.Group();
  root.name = "Horizon · reliefs et cité lointaine";
  scene.add(root);
  const geometries = [],
    materials = [],
    meshes = [];
  const dummy = new THREE.Object3D();
  const geometry = (g) => (geometries.push(g), g);
  function material(color, vertexColors = false) {
    const m = new THREE.MeshBasicMaterial({
      color,
      vertexColors,
      fog: false,
      depthWrite: false,
      depthTest: false,
    });
    // Décor de fond : le plan lointain de la caméra reste libre pour les PLV.
    m.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader.replace(
        "#include <project_vertex>",
        "#include <project_vertex>\n gl_Position.z=gl_Position.w*0.9999;",
      );
    };
    m.customProgramCacheKey = () => "plv-horizon-v1";
    materials.push(m);
    return m;
  }
  const mountainFar = material("#bccbd5", true),
    mountainNear = material("#99afc0", true),
    cityMat = material("#7c94a8"),
    facetMat = material("#9bb1bd"),
    glassMat = material("#728e9f"),
    lightMat = material("#b3d5dc");
  function add(mesh, order = -8000) {
    mesh.frustumCulled = false;
    mesh.renderOrder = order;
    root.add(mesh);
    meshes.push(mesh);
    return mesh;
  }
  function ridge(radius, phase, mat) {
    const positions = [],
      colors = [],
      count = 128;
    const tint = new THREE.Color();
    function point(i, high) {
      const angle = (i / count) * Math.PI * 2;
      const h =
        160 +
        95 * Math.sin(angle * 5 + phase) +
        60 * Math.sin(angle * 11 + phase * 0.7) +
        40 * Math.cos(angle * 19);
      return [
        Math.cos(angle) * radius,
        high ? Math.max(50, h) : -200,
        Math.sin(angle) * radius,
      ];
    }
    for (let i = 0; i < count; i++) {
      const a = point(i, false),
        b = point(i, true),
        c = point(i + 1, false),
        d = point(i + 1, true);
      const shade = 0.82 + 0.15 * (0.5 + 0.5 * Math.sin(i * 2.4 + phase));
      for (const p of [a, c, b, b, c, d]) {
        positions.push(...p);
        tint.setRGB(shade, shade, shade);
        colors.push(tint.r, tint.g, tint.b);
      }
    }
    const g = geometry(new THREE.BufferGeometry());
    g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    add(new THREE.Mesh(g, mat), -8500);
  }
  ridge(2750, 0.2, mountainFar);
  ridge(2450, 2.7, mountainNear);
  const unit = geometry(new THREE.BoxGeometry(1, 1, 1));
  const towers = add(new THREE.InstancedMesh(unit, cityMat, 144));
  const crowns = add(new THREE.InstancedMesh(unit, facetMat, 144));
  const windows = add(new THREE.InstancedMesh(unit, glassMat, 144));
  const beacons = add(new THREE.InstancedMesh(unit, lightMat, 72));
  function set(mesh, i, x, y, z, w, h, d, yaw = 0) {
    dummy.position.set(x, y, z);
    dummy.rotation.set(0, yaw, 0);
    dummy.scale.set(w, h, d);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  // L'ordre répartit aussi le préréglage Basse sur 360°, sans moitié d'horizon vide.
  for (let i = 0; i < 144; i++) {
    const slot = (i * 55) % 144,
      a = (slot / 144) * Math.PI * 2,
      r = 1770 + (slot % 7) * 22,
      x = Math.cos(a) * r,
      z = Math.sin(a) * r,
      w = 16 + (slot % 5) * 6,
      d = 18 + (slot % 3) * 9,
      h = 55 + ((slot * 37) % 155);
    set(towers, i, x, h * 0.5 - 10, z, w, h, d, -a);
    set(
      crowns,
      i,
      x + Math.cos(a) * 5,
      h * 0.91,
      z + Math.sin(a) * 5,
      w * 0.58,
      h * 0.31,
      d * 0.68,
      -a,
    );
    set(
      windows,
      i,
      x + Math.cos(a) * w * 0.47,
      h * 0.53,
      z + Math.sin(a) * w * 0.47,
      1.4,
      h * 0.72,
      d * 0.65,
      -a,
    );
    if (i < 72) set(beacons, i, x, h * 0.78, z, w * 1.03, 1.1, d * 1.03, -a);
  }
  for (const m of [towers, crowns, windows, beacons])
    m.instanceMatrix.needsUpdate = true;
  // Navettes sans texture : coque fuselée, aile delta, signature moteur discrète.
  const hull = geometry(new THREE.ConeGeometry(1, 3, 4));
  hull.rotateX(Math.PI / 2);
  const airMat = material("#576f85"),
    engineMat = material("#b3e3e9");
  const aircraft = add(new THREE.InstancedMesh(hull, airMat, 6), -7800),
    engines = add(new THREE.InstancedMesh(unit, engineMat, 6), -7800);
  aircraft.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  engines.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  let lastQuality = null,
    lastNight = null;
  const phases = [0.4, 1.5, 2.7, 3.8, 4.9, 5.8];
  function update(now, enabled, map, quality, hour, legacy = false) {
    root.visible = enabled && !map && !legacy;
    if (!root.visible) return;
    const low = quality === "low";
    if (quality !== lastQuality) {
      towers.count = crowns.count = windows.count = low ? 72 : 144;
      beacons.count = low ? 24 : 72;
      aircraft.count = engines.count = low ? 2 : 6;
      lastQuality = quality;
    }
    const night = hour < 8.5 || hour >= 19;
    if (night !== lastNight) {
      mountainFar.color.set(night ? "#697f97" : "#bccbd5");
      mountainNear.color.set(night ? "#536a81" : "#99afc0");
      glassMat.color.set(night ? "#486878" : "#728e9f");
      airMat.color.set(night ? "#35485d" : "#576f85");
      cityMat.color.set(night ? "#405268" : "#7c94a8");
      facetMat.color.set(night ? "#53677d" : "#9bb1bd");
      lightMat.color.set(night ? "#a4dce7" : "#b3d5dc");
      lastNight = night;
    }
    const t = now * 0.000018;
    for (let i = 0; i < aircraft.count; i++) {
      const a = phases[i] + t * (i % 2 ? -0.7 : 1),
        r = 1060 + i * 100,
        x = 50 + Math.cos(a) * r,
        z = 50 + Math.sin(a) * r,
        y = 135 + i * 27 + Math.sin(a * 2) * 12;
      // Les navettes restent un décor aérien, sans trajectoire dans les lots.
      dummy.position.set(x, y, z);
      dummy.rotation.set(0.04, -a + (i % 2 ? Math.PI : 0), Math.sin(a) * 0.08);
      dummy.scale.set(7, 2.4, 12);
      dummy.updateMatrix();
      aircraft.setMatrixAt(i, dummy.matrix);
      dummy.position.set(x + Math.sin(a) * 9, y, z - Math.cos(a) * 9);
      dummy.rotation.set(0, -a, 0);
      dummy.scale.set(2.1, 0.6, 0.9);
      dummy.updateMatrix();
      engines.setMatrixAt(i, dummy.matrix);
    }
    aircraft.instanceMatrix.needsUpdate =
      engines.instanceMatrix.needsUpdate = true;
  }
  return {
    root,
    update,
    get drawCalls() {
      return root.visible ? 8 : 0;
    },
    dispose() {
      for (const mesh of meshes) mesh.dispose?.();
      for (const g of geometries) g.dispose();
      for (const m of materials) m.dispose();
      root.removeFromParent();
    },
  };
}
