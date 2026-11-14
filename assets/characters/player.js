// Personnage Innerscene (CC0) : les animations sont jouées sur son propre squelette.
const MODEL_URL = new URL('./models/sam.glb', import.meta.url);

export async function loadPlayer(THREE, GLTFLoader, parent) {
  const gltf = await new GLTFLoader().loadAsync(MODEL_URL.href);
  const root = gltf.scene;
  const clips = Object.fromEntries(gltf.animations.map(clip => [clip.name, clip]));
  if (!clips.Idle_Standing || !clips.Walk_Relaxed || !clips.Run)
    throw new Error('Animations du personnage incomplètes');
  root.traverse(object => {
    if (object.isMesh) { object.castShadow = true; object.receiveShadow = true; }
  });
  root.rotation.y = Math.PI;
  parent.add(root);
  const mixer = new THREE.AnimationMixer(root);
  const actions = {
    idle: mixer.clipAction(clips.Idle_Standing),
    walk: mixer.clipAction(clips.Walk_Relaxed),
    run: mixer.clipAction(clips.Run),
  };
  let active = 'idle';
  actions.idle.play();
  return {
    root,
    update(dt, { speed = 0, running = false, airborne = false } = {}) {
      const state = airborne ? 'idle' : speed > 0.15 ? (running ? 'run' : 'walk') : 'idle';
      if (state !== active) {
        const next = actions[state];
        next.reset().setEffectiveWeight(1).play();
        actions[active].crossFadeTo(next, 0.2, false);
        active = state;
      }
      if (active === 'walk') actions.walk.setEffectiveTimeScale(THREE.MathUtils.clamp(speed / 1.3, 0.6, 2));
      if (active === 'run') actions.run.setEffectiveTimeScale(THREE.MathUtils.clamp(speed / 4.5, 0.7, 1.5));
      mixer.update(dt);
    },
    dispose() { mixer.stopAllAction(); mixer.uncacheRoot(root); parent.remove(root); },
    get state() { return active; },
  };
}
