import { clone as cloneSkeleton } from "three/addons/utils/SkeletonUtils.js";
const CHARACTER_URL = new URL("./homme-contemporain.glb", import.meta.url);
const ANIMATIONS_URL = new URL("./UAL1_Standard.glb", import.meta.url);

// Quaternius humanoid rig -> uploaded Mixamo rig. Clips are converted to
// world-space rotations, then resampled into the character's local hierarchy.
const NAMES = {
  _rootJoint: "root",
  mixamorig_Hips_01: "pelvis",
  mixamorig_Spine_02: "spine_01",
  mixamorig_Spine1_03: "spine_02",
  mixamorig_Spine2_04: "spine_03",
  mixamorig_Neck_05: "neck_01",
  mixamorig_Head_06: "Head",
  mixamorig_LeftShoulder_010: "clavicle_l",
  mixamorig_LeftArm_011: "upperarm_l",
  mixamorig_LeftForeArm_012: "lowerarm_l",
  mixamorig_LeftHand_013: "hand_l",
  mixamorig_RightShoulder_034: "clavicle_r",
  mixamorig_RightArm_035: "upperarm_r",
  mixamorig_RightForeArm_036: "lowerarm_r",
  mixamorig_RightHand_037: "hand_r",
  mixamorig_RightUpLeg_058: "thigh_r",
  mixamorig_RightLeg_00: "calf_r",
  mixamorig_RightFoot_059: "foot_r",
  mixamorig_RightToeBase_060: "ball_r",
  mixamorig_LeftUpLeg_062: "thigh_l",
  mixamorig_LeftLeg_063: "calf_l",
  mixamorig_LeftFoot_064: "foot_l",
  mixamorig_LeftToeBase_065: "ball_l",
};

for (const side of ["Left", "Right"]) {
  const suffix = side === "Left" ? "l" : "r";
  for (const [source, target, index] of [
    ["index", "Index", 22],
    ["middle", "Middle", 14],
    ["ring", "Ring", 26],
    ["pinky", "Pinky", 30],
    ["thumb", "Thumb", 18],
  ]) {
    for (let joint = 1; joint <= 4; joint++) {
      const targetIndex = index + joint - 1;
      const sourceJoint = joint === 4 ? "04_leaf" : `0${joint}`;
      NAMES[`mixamorig_${side}Hand${target}${joint}_${String(targetIndex).padStart(3, "0")}`] =
        `${source}_${sourceJoint}_${suffix}`;
    }
  }
}

const CLIPS = {
  idle: "Idle_Loop",
  walk: "Walk_Formal_Loop",
  run: "Sprint_Loop",
  jumpStart: "Jump_Start",
  jump: "Jump_Loop",
  land: "Jump_Land",
  sitting: "Sitting_Idle_Loop",
  walkCasual: "Walk_Loop",
  talk: "Idle_Talking_Loop",
  interact: "Interact",
  push: "Push_Loop",
};
function load(loader, url) {
  return new Promise((resolve, reject) => loader.load(url.href, resolve, undefined, reject));
}

async function buildHuman(THREE, GLTFLoader, parent) {
  const loader = new GLTFLoader();
  const [character, library] = await Promise.all([
    load(loader, CHARACTER_URL),
    load(loader, ANIMATIONS_URL),
  ]);
  const root = character.scene;
  root.name = "Personnage · Mike Alger / CC BY 4.0";
  root.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });

  const bounds = new THREE.Box3().setFromObject(root);
  const height = bounds.max.y - bounds.min.y;
  if (!(height > 0)) throw Error("Dimensions du personnage invalides");
  root.scale.setScalar(1.8 / height);
  const scaledBounds = new THREE.Box3().setFromObject(root);
  root.position.y -= scaledBounds.min.y;
  root.rotation.y = Math.PI; // Le modèle source regarde vers +Z, le jeu vers -Z.

  const target = [];
  root.traverse((o) => {
    if (o.isSkinnedMesh && !target.length) target.push(o);
  });
  const source = [];
  library.scene.traverse((o) => {
    if (o.isSkinnedMesh && !source.length) source.push(o);
  });
  if (!target.length || !source.length)
    throw Error("Squelette du personnage ou du kit d’animations introuvable");

  const sourceBones = new Map(), targetBones = new Map();
  library.scene.traverse((o) => { if (o.isBone) sourceBones.set(o.name, o); });
  root.traverse((o) => { if (o.isBone) targetBones.set(o.name, o); });
  root.updateMatrixWorld(true);
  library.scene.updateMatrixWorld(true);
  const sourceRest = new Map(), targetRest = new Map();
  for (const [targetName, sourceName] of Object.entries(NAMES)) {
    const sourceBone = sourceBones.get(sourceName), targetBone = targetBones.get(targetName);
    if (!sourceBone || !targetBone) continue;
    sourceRest.set(sourceName, sourceBone.getWorldQuaternion(new THREE.Quaternion()));
    targetRest.set(targetName, targetBone.getWorldQuaternion(new THREE.Quaternion()));
  }
  const sourceMixer = new THREE.AnimationMixer(library.scene);
  const actionMixer = new THREE.AnimationMixer(root);
  // Bras : le retargeting laisse les bras tendus vers l'avant. On les repose le long du corps,
  // dans le repère du personnage (qui tourne sur lui-même), avec un balancement calé sur les jambes.
  const armParts = [
    { side: 1, arm: "mixamorig_LeftArm_011", fore: "mixamorig_LeftForeArm_012", hand: "mixamorig_LeftHand_013" },
    { side: -1, arm: "mixamorig_RightArm_035", fore: "mixamorig_RightForeArm_036", hand: "mixamorig_RightHand_037" },
  ];
  const footL = targetBones.get("mixamorig_LeftFoot_064"), footR = targetBones.get("mixamorig_RightFoot_059");
  const avatarFrame = new THREE.Quaternion(), avatarFrameInverse = new THREE.Quaternion();
  const p0 = new THREE.Vector3(), p1 = new THREE.Vector3(), cur = new THREE.Vector3(), want = new THREE.Vector3();
  const delta = new THREE.Quaternion(), parentQ = new THREE.Quaternion(), corr = new THREE.Quaternion();
  const aim = (bone, child, dirLocal) => {
    bone.updateWorldMatrix(true, true);
    bone.getWorldPosition(p0);
    child.getWorldPosition(p1);
    cur.copy(p1).sub(p0).normalize();
    want.copy(dirLocal).normalize().applyQuaternion(avatarFrame);
    delta.setFromUnitVectors(cur, want);
    bone.parent.getWorldQuaternion(parentQ);
    corr.copy(parentQ).invert().multiply(delta).multiply(parentQ);
    bone.quaternion.premultiply(corr);
    bone.updateWorldMatrix(false, true);
  };
  let armSwing = 0;
  const actions = {};
  const clipByName = new Map(library.animations.map((clip) => [clip.name, clip]));
  for (const [state, clipName] of Object.entries(CLIPS)) {
    const sourceClip = clipByName.get(clipName);
    if (!sourceClip) continue;
    const frameCount = Math.max(2, Math.ceil(sourceClip.duration * 30));
    const times = Float32Array.from({ length: frameCount }, (_, i) =>
      Math.min(sourceClip.duration - 1e-5, i * sourceClip.duration / (frameCount - 1)));
    const valuesByTarget = new Map();
    for (const bone of target[0].skeleton.bones) {
      if (targetRest.has(bone.name)) valuesByTarget.set(bone.name, new Float32Array(frameCount * 4));
    }
    const sourceAction = sourceMixer.clipAction(sourceClip);
    sourceAction.play();
    for (let frame = 0; frame < frameCount; frame++) {
      sourceMixer.setTime(times[frame]);
      library.scene.updateMatrixWorld(true);
      for (const bone of target[0].skeleton.bones) {
        const sourceName = NAMES[bone.name], restQ = targetRest.get(bone.name);
        if (!sourceName || !restQ || !sourceRest.has(sourceName)) continue;
        const sourceDelta = sourceRest.get(sourceName).clone().invert()
          .multiply(sourceBones.get(sourceName).getWorldQuaternion(new THREE.Quaternion()));
        const desiredWorld = restQ.clone().multiply(sourceDelta);
        const parentWorld = bone.parent?.isBone
          ? bone.parent.getWorldQuaternion(new THREE.Quaternion())
          : root.getWorldQuaternion(new THREE.Quaternion());
        bone.quaternion.copy(parentWorld.invert().multiply(desiredWorld));
        bone.quaternion.toArray(valuesByTarget.get(bone.name), frame * 4);
        bone.updateMatrixWorld(true);
      }
      root.updateMatrixWorld(true);
    }
    sourceAction.stop();
    const clip = new THREE.AnimationClip(sourceClip.name, sourceClip.duration,
      [...valuesByTarget].map(([name, values]) =>
        new THREE.QuaternionKeyframeTrack(`${name}.quaternion`, times, values)));
    if (clip.tracks.length) actions[state] = actionMixer.clipAction(clip);
  }
  if (!actions.idle || !actions.walk || !actions.run)
    throw Error("Animations d’arrêt, marche ou course indisponibles");

  // The source mannequin is only needed while converting the clips.
  library.scene.traverse((o) => {
    if (o.isMesh) {
      o.geometry?.dispose();
      for (const material of Array.isArray(o.material) ? o.material : [o.material]) {
        material?.map?.dispose();
        material?.dispose();
      }
    }
  });

  // Calculer une seule fois les bras du groupe, sans toucher aux clips du joueur.
  let bakedClips;
  function bakeCrowdClips(){
  if(bakedClips)return bakedClips;
  const preparedClips = {};
  const bakeMixer = new THREE.AnimationMixer(root);
  for (const [state, original] of Object.entries(actions)) {
    if (!['idle','walk','walkCasual','talk','interact','push','sitting'].includes(state)) continue;
    const clip=original.getClip(), action=bakeMixer.clipAction(clip), frames=Math.max(2,Math.ceil(clip.duration*30));
    const times=Float32Array.from({length:frames},(_,i)=>Math.min(clip.duration-1e-5,i*clip.duration/(frames-1)));
    const names=armParts.flatMap(p=>[p.arm,p.fore]);
    const values=names.map(()=>new Float32Array(frames*4));action.play();
    for(let f=0;f<frames;f++){
      bakeMixer.setTime(times[f]);parent.updateWorldMatrix(true,false);parent.getWorldQuaternion(avatarFrame);avatarFrameInverse.copy(avatarFrame).invert();root.updateMatrixWorld(true);
      const swing=(state==='walk'||state==='walkCasual')?.5:0;let phase=0;
      if(footL&&footR&&swing){footL.getWorldPosition(p0);footR.getWorldPosition(p1);phase=THREE.MathUtils.clamp(p0.sub(p1).applyQuaternion(avatarFrameInverse).z/.5,-1,1);}
      for(const {side,arm,fore,hand} of armParts){const bone=targetBones.get(arm),lower=targetBones.get(fore),end=targetBones.get(hand);if(!bone||!lower||!end)continue;const a=swing*phase*side;aim(bone,lower,want.set(side*.12,-1,-a*.55));aim(lower,end,want.set(side*.05,-.9,-(.3+.35*Math.max(0,a))));}
      names.forEach((name,i)=>targetBones.get(name)?.quaternion.toArray(values[i],f*4));
    }
    action.stop();const tracks=clip.tracks.filter(t=>!names.some(n=>t.name===n+'.quaternion'));
    names.forEach((name,i)=>{if(targetBones.has(name))tracks.push(new THREE.QuaternionKeyframeTrack(name+'.quaternion',times,values[i]));});
    preparedClips[state]=new THREE.AnimationClip(clip.name+'-visiteur',clip.duration,tracks);
  }
  bakeMixer.stopAllAction();
  bakedClips=preparedClips;
  return bakedClips;
  }
  parent.add(root);
  let active = null;
  let wasAirborne = false;
  const play = (state, fade = 0.18) => {
    const next = actions[state];
    if (!next || active === state) return;
    const previous = active ? actions[active] : null;
    active = state;
    next.reset().setEffectiveWeight(1).setEffectiveTimeScale(1).play();
    if (previous) previous.crossFadeTo(next, fade, false);
  };
  play("idle", 0);

  return {
    root,
    getCrowdClips: bakeCrowdClips,
    reparent(next){ next.add(root); parent=next; },
    update(dt, { speed = 0, running = false, airborne = false } = {}) {
      if (airborne) {
        if (!wasAirborne) {
          wasAirborne = true;
          const action = actions.jumpStart || actions.jump;
          if (action === actions.jumpStart) {
            action.setLoop(THREE.LoopOnce, 1);
            action.clampWhenFinished = true;
            play("jumpStart");
          } else play("jump");
        } else if (
          active === "jumpStart" &&
          actions.jumpStart.time >= actions.jumpStart.getClip().duration - 0.04
        ) {
          play("jump");
        }
      } else if (wasAirborne) {
        wasAirborne = false;
        if (actions.land) {
          actions.land.setLoop(THREE.LoopOnce, 1);
          actions.land.clampWhenFinished = true;
          play("land");
        }
      } else if (
        active === "land" &&
        actions.land.time >= actions.land.getClip().duration - 0.04
      ) {
        play(speed > 0.15 ? (running ? "run" : "walk") : "idle");
      } else if (!wasAirborne && active !== "land") {
        const state = speed > 0.15 ? (running ? "run" : "walk") : "idle";
        play(state);
        if (active === "walk")
          actions.walk.setEffectiveTimeScale(THREE.MathUtils.clamp(speed / 1.65, 0.72, 1.38));
        if (active === "run")
          actions.run.setEffectiveTimeScale(THREE.MathUtils.clamp(speed / 4.95, 0.78, 1.35));
      }
      actionMixer.update(dt);
      // Bras le long du corps. Le personnage regarde vers -Z dans son repère (voir root.rotation.y).
      parent.updateWorldMatrix(true, false);
      parent.getWorldQuaternion(avatarFrame);
      avatarFrameInverse.copy(avatarFrame).invert();
      root.updateMatrixWorld(true);
      const targetSwing = active === "run" ? 0.9 : active === "walk" ? 0.5 : 0;
      armSwing += (targetSwing - armSwing) * Math.min(1, dt * 8);
      let phase = 0;
      if (footL && footR && armSwing > 0.01) {
        footL.getWorldPosition(p0);
        footR.getWorldPosition(p1);
        phase = THREE.MathUtils.clamp(p0.sub(p1).applyQuaternion(avatarFrameInverse).z / 0.5, -1, 1);
      }
      for (const { side, arm, fore } of armParts) {
        const bone = targetBones.get(arm), forearm = targetBones.get(fore);
        const hand = targetBones.get(side === 1 ? "mixamorig_LeftHand_013" : "mixamorig_RightHand_037");
        if (!bone || !forearm || !hand) continue;
        const a = armSwing * phase * side; // + = bras vers l'avant
        aim(bone, forearm, want.set(side * 0.12, -1, -a * 0.55));
        aim(forearm, hand, want.set(side * 0.05, -0.9, -(0.3 + 0.35 * Math.max(0, a))));
      }
    },
    dispose() {
      actionMixer.stopAllAction();
    actionMixer.uncacheRoot(target[0]);
      parent.remove(root);
    },
    get state() {
      return active;
    },
  };
}

let basePromise,sharedKitPromise;
function loadBase(THREE,GLTFLoader){
  if(!basePromise)basePromise=buildHuman(THREE,GLTFLoader,new THREE.Group()).catch(error=>{basePromise=null;throw error;});
  return basePromise;
}
export function loadHumanKit(THREE, GLTFLoader) {
  if(!sharedKitPromise)sharedKitPromise=loadBase(THREE,GLTFLoader).then(controller=>({template:controller.root,clips:controller.getCrowdClips(),controller})).catch(error=>{sharedKitPromise=null;throw error;});
  return sharedKitPromise;
}
export async function loadHuman(THREE, GLTFLoader, parent) {
  const controller=await loadBase(THREE,GLTFLoader);
  controller.reparent(parent);
  return controller;
}
export function cloneHuman(THREE,kit,{tint=null,scale=1}={}) {
  const root=cloneSkeleton(kit.template), mixer=new THREE.AnimationMixer(root), actions={};
  kit.palettes??=new Map();const key=tint||"default";if(!kit.palettes.has(key))kit.palettes.set(key,new Map());const palette=kit.palettes.get(key);
  root.scale.multiplyScalar(scale);
  root.traverse(o=>{if(!o.isMesh)return;o.castShadow=false;o.receiveShadow=true;if(tint && /^(Object_11|Object_13|Object_17)$/.test(o.name)){if(!palette.has(o.material)){const material=o.material.clone();material.color.multiply(new THREE.Color(tint));palette.set(o.material,material);}o.material=palette.get(o.material);}});
  for(const [name,clip] of Object.entries(kit.clips))actions[name]=mixer.clipAction(clip);
  // Préparer les liaisons d’animation une fois, avant l’affichage du visiteur.
  for(const action of Object.values(actions)){action.play();mixer.update(0);action.stop();}
  return {root,mixer,actions};
}
