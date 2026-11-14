import { AssetLibrary } from "../library/manager.js";
export async function loadSedan(THREE, parent) {
  const library = new AssetLibrary({
    manifestUrl: new URL("./manifest.json", import.meta.url),
  });
  const acquired = await Promise.allSettled([
    library.acquire("berline", 0),
    library.acquire("berline", 1),
  ]);
  const handles = acquired
    .filter((r) => r.status === "fulfilled")
    .map((r) => r.value);
  if (handles.length !== 2) {
    handles.forEach((h) => h.release());
    library.dispose();
    throw Error("Berline indisponible");
  }
  const root = new THREE.Group(),
    lod = new THREE.LOD(),
    wheelSets = [],
    owned = [];
  root.name = "Berline contemporaine · Comrade1280";
  root.add(lod);
  for (const h of handles) {
    const model = h.scene,
      sets = { steers: [], wheels: [], head: [], tail: [] };
    model.traverse((o) => {
      if (o.name.startsWith("steer_F")) sets.steers.push(o);
      if (o.name.startsWith("wheel_")) sets.wheels.push(o);
      if (o.isMesh) {
        o.castShadow = o.receiveShadow = true;
        const original = o.material;
        if (!Array.isArray(original)) {
          // Les matériaux sont propres au véhicule : jamais de mutation du cache partagé.
          o.material = original.clone();
          owned.push(o.material);
          if (original.name === "Headlights") {
            o.material.emissive.set("#eef6ff");
            o.material.emissiveMap = o.material.map;
            sets.head.push(o.material);
          }
          if (original.name === "Tail lamps") {
            o.material.emissive.set("#ff1b12");
            o.material.emissiveMap = o.material.map;
            sets.tail.push(o.material);
          }
        }
      }
    });
    wheelSets.push(sets);
    lod.addLevel(model, h.lod.level ? 65 : 0);
  }
  const lights = [];
  for (const side of [-1, 1]) {
    const target = new THREE.Object3D();
    target.position.set(side * 0.65, 0.05, -18);
    root.add(target);
    const light = new THREE.SpotLight("#e7f1ff", 55, 27, 0.45, 0.65, 1.5);
    light.position.set(side * 0.65, 0.62, -2.2);
    light.target = target;
    light.castShadow = false;
    root.add(light);
    lights.push(light);
  }
  const reverseMat = new THREE.MeshStandardMaterial({
    color: "#eaf1ff",
    emissive: "#eaf1ff",
    emissiveIntensity: 0,
    roughness: 0.25,
  });
  owned.push(reverseMat);
  const reverseGeo = new THREE.BoxGeometry(0.16, 0.075, 0.015);
  for (const side of [-1, 1]) {
    const m = new THREE.Mesh(reverseGeo, reverseMat);
    m.position.set(side * 0.51, 0.67, 2.27);
    root.add(m);
  }
  parent.add(root);
  let disposed = false;
  return {
    root,
    library,
    headlights: true,
    update(state, camera, quality = "medium") {
      if (disposed) return;
      lod.autoUpdate = false;
      lod.update(camera);
      if (quality === "low") {
        lod.levels[0].object.visible = false;
        lod.levels[1].object.visible = true;
      }
      for (const set of wheelSets) {
        for (const p of set.steers) p.rotation.y = -state.steer;
        for (const w of set.wheels) w.rotation.x = state.wheelAngle;
        for (const m of set.head)
          m.emissiveIntensity = this.headlights ? 1.8 : 0.04;
        for (const m of set.tail)
          m.emissiveIntensity = state.braking ? 3.2 : 0.45;
      }
      for (const l of lights) l.visible = this.headlights && quality !== "low";
      reverseMat.emissiveIntensity = state.speed < -0.15 ? 2.5 : 0;
      // Suspension visuelle limitée : ne modifie pas les collisions ni la hauteur au sol.
      lod.rotation.z = Math.max(-0.022, Math.min(0.022, state.lateral * 0.01));
    },
    get statistics() {
      return {
        loaded: true,
        headlights: this.headlights,
        wheels: wheelSets[0].wheels.length,
        ...library.statistics,
      };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      root.removeFromParent();
      owned.forEach((m) => m.dispose());
      reverseGeo.dispose();
      handles.forEach((h) => h.release());
      library.dispose();
    },
  };
}
