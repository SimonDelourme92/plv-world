import { clone as cloneSkeleton } from "three/addons/utils/SkeletonUtils.js";
import {
  randomSeed,
  canSpawn,
  shouldRecycle,
  chooseNextLot,
  chooseStop,
  stopDuration,
  vehicleSideStep,
  distanceSquaredToBounds,
} from "./crowd-logic.js";

export async function loadCrowdKit(GLTFLoader) {
  const loader = new GLTFLoader();
  return Promise.all(["maya", "sam", "harper"].map(async (name) => {
    const gltf = await loader.loadAsync(`./assets/npc/models/${name}.glb`);
    if (!gltf.animations.length) throw new Error(`Animation manquante : ${name}`);
    return { template: gltf.scene, walk: gltf.animations[0] };
  }));
}
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
export function createCrowd({
  THREE,
  scene,
  kit,
  getRecords,
  terrainHeight,
  collides,
  router,
  getBlockers,
  waterLevel,
  getPlayer,
  getCar,
}) {
  const random = randomSeed(92641),
    root = new THREE.Group();
  root.name = "Visiteurs";
  scene.add(root);
  // Six personnages complets maximum : les géométries et textures sont partagées.
  // Les anciens blocs lointains ne représentent pas des personnes et ne sont plus affichés.
  const slots = Array.from({ length: 6 }, (_, i) => {
    const type = i % kit.length;
    const model = cloneSkeleton(kit[type].template);
    const mixer = new THREE.AnimationMixer(model);
    const walk = mixer.clipAction(kit[type].walk);
    walk.play();
    model.visible = false;
    root.add(model);
    const meshes = [];
    model.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = false;
        o.receiveShadow = true;
        meshes.push(o);
      }
    });
    return { root: model, mixer, walk, meshes, type, owner: -1, elapsed: 0 };
  });
  const people = Array.from({ length: 40 }, (_, i) => {
    const modelType = i % kit.length;
    return {
      evadePoint: { x: 0, z: 0 },
      buddy: i > 0 && random() < 0.2 ? i - 1 : -1,
      pairPoint: { x: 0, z: 0 },
      pairPath: [null, null],
      headTurn: 0,
      id: i,
      x: 0,
      z: 0,
      y: 0,
      yaw: 0,
      speed: 1.1 + random() * 0.4,
      scale: 0.92 + random() * 0.14,
      modelType,
      active: false,
      lot: null,
      history: [],
      path: null,
      index: 0,
      waiting: false,
      stop: 0,
      anim: "idle",
      phase: random() * 6,
      rank: 0,
      nextSim: 0,
      lastSim: 0,
      slot: -1,
    };
  });
  const frustum = new THREE.Frustum(),
    matrix = new THREE.Matrix4(),
    point = new THREE.Vector3(),
    direction = new THREE.Vector3(),
    bounds = new THREE.Sphere(new THREE.Vector3(), 1.9);
  let count = 24,
    enabled = true,
    renderable = true,
    frozen = false,
    shadows = true,
    frame = 0,
    actifs = 0,
    detailles = 0,
    simplifies = 0,
    lastMs = 0,
    pending = 0,
    drawCalls = 0;
  function recordDraw() {
    drawCalls++;
  }
  for (const slot of slots)
    for (const mesh of slot.meshes) {
      mesh.onBeforeRender = recordDraw;
      mesh.onBeforeShadow = recordDraw;
    }
  const inside = (x, z, y = terrainHeight(x, z)) => {
    bounds.center.set(x, y + 0.9, z);
    return frustum.intersectsSphere(bounds);
  };
  const dry = (x, z) => terrainHeight(x, z) >= waterLevel + 0.15;
  function safe(x, z) {
    const h = terrainHeight(x, z),
      y = h + 1.7;
    return (
      h >= waterLevel + 0.15 &&
      !collides(x, z, y) &&
      !collides(x + 0.4, z, y) &&
      !collides(x - 0.4, z, y) &&
      !collides(x, z + 0.4, y) &&
      !collides(x, z - 0.4, y)
    );
  }
  function clearOfPeople(p, x, z) {
    for (let i = 0; i < people.length; i++) {
      const q = people[i];
      if (q === p || !q.active) continue;
      const before = (p.x - q.x) ** 2 + (p.z - q.z) ** 2,
        after = (x - q.x) ** 2 + (z - q.z) ** 2;
      if (after < 1.44 && after <= before) return false;
    }
    return true;
  }
  function outsideCar(x, z, car) {
    if (!car || !car.active) return true;
    const c = Math.cos(car.yaw),
      s = Math.sin(car.yaw),
      dx = x - car.x,
      dz = z - car.z;
    return Math.abs(c * dx - s * dz) >= 1.5 || Math.abs(s * dx + c * dz) >= 2.6;
  }
  function clearSpawn(p, x, z, player, car) {
    if (
      Math.hypot(x - player.x, z - player.z) < 0.8 ||
      !outsideCar(x, z, car) ||
      !safe(x, z)
    )
      return false;
    for (let i = 0; i < people.length; i++) {
      const q = people[i];
      if (q !== p && q.active && (q.x - x) ** 2 + (q.z - z) ** 2 < 1.44)
        return false;
    }
    return true;
  }
  function assign(p, player, records, blockers) {
    const lot = chooseNextLot(records, p.history, player.x, player.z, random);
    if (!lot) {
      p.waiting = false;
      p.stop = 3 + random() * 5;
      p.anim = "idle";
      return;
    }
    const dest = chooseStop(
      lot.bounds,
      blockers,
      terrainHeight,
      waterLevel,
      random,
    );
    if (!dest) {
      p.waiting = false;
      p.stop = 2;
      p.anim = "idle";
      return;
    }
    let route = null;
    const dx = dest.x - p.x,
      dz = dest.z - p.z,
      length = Math.hypot(dx, dz);
    if (length < 40) {
      let clear = true;
      const steps = Math.ceil(length / 2);
      for (let n = 1; n < steps && clear; n++) {
        const x = p.x + (dx * n) / steps,
          z = p.z + (dz * n) / steps;
        if (!safe(x, z)) clear = false;
      }
      if (clear) route = { points: [{ x: p.x, z: p.z }, dest] };
    }
    if (!route)
      route = router.route({ x: p.x, z: p.z }, dest, {
        mode: "walk",
        obstacles: blockers,
      });
    if (!route || route.points.some((q) => !dry(q.x, q.z))) {
      p.waiting = false;
      p.stop = 2;
      p.anim = "idle";
      return;
    }
    p.lot = lot;
    p.path = route.points;
    p.index = 1;
    p.waiting = false;
    p.stop = 0;
    p.anim = "walk";
    p.history.unshift(lot.lot.id);
    if (p.history.length > 3) p.history.pop();
  }
  function spawn(p, player, camera, car) {
    if (p.buddy >= 0 && people[p.buddy].active) {
      const leader = people[p.buddy],
        x = leader.x + 1.3 * Math.cos(leader.yaw),
        z = leader.z - 1.3 * Math.sin(leader.yaw);
      if (
        canSpawn(x, z, player.x, player.z, inside) &&
        clearSpawn(p, x, z, player, car)
      ) {
        p.x = x;
        p.z = z;
        p.y = terrainHeight(x, z);
        p.active = true;
        p.waiting = true;
        p.path = null;
        p.stop = 0;
        return true;
      }
    }
    const records = getRecords();
    let near = null,
      seen = 0;
    for (let i = 0; i < records.length; i++) {
      const r = records[i];
      if (r.isTest) continue;
      if (
        distanceSquaredToBounds(player.x, player.z, r.bounds) < 14400 &&
        random() < 1 / ++seen
      )
        near = r;
    }
    const cx = near ? (near.bounds.min.x + near.bounds.max.x) / 2 : player.x,
      cz = near ? (near.bounds.min.z + near.bounds.max.z) / 2 : player.z;
    for (let i = 0; i < 14; i++) {
      const a = random() * Math.PI * 2,
        r = near
          ? Math.hypot(
              near.bounds.max.x - near.bounds.min.x,
              near.bounds.max.z - near.bounds.min.z,
            ) *
              0.5 +
            12 +
            random() * 35
          : 25 + random() * 55,
        x = cx + Math.cos(a) * r,
        z = cz + Math.sin(a) * r;
      if (
        Math.hypot(x - player.x, z - player.z) > 120 ||
        Math.abs(x) > router.halfExtent - 2 ||
        Math.abs(z) > router.halfExtent - 2 ||
        !canSpawn(x, z, player.x, player.z, inside) ||
        !clearSpawn(p, x, z, player, car)
      )
        continue;
      p.x = x;
      p.z = z;
      p.y = terrainHeight(x, z);
      p.active = true;
      p.waiting = true;
      p.path = null;
      p.stop = 0;
      return true;
    }
    return false;
  }
  // Préparer l’itinéraire hors de la boucle de rendu, un seul à la fois.
  let routing = false,
    routePerson = null,
    routePlayer = null,
    disposed = false;
  function routeOnce() {
    if (!routing || disposed) return;
    const p = routePerson;
    try {
      if (enabled && renderable && !frozen && p?.active && p.waiting)
        assign(p, routePlayer, getRecords(), getBlockers());
    } catch (error) {
      console.warn("Itinéraire piéton indisponible :", error);
      if (p) {
        p.waiting = false;
        p.stop = 3;
      }
    } finally {
      routing = false;
      routePerson = null;
      routePlayer = null;
    }
  }
  const routeTimer = setInterval(routeOnce, 16);
  function update(dt, camera, now) {
    if (!enabled || !renderable) {
      root.visible = false;
      return;
    }
    root.visible = true;
    const start = performance.now(),
      player = getPlayer(),
      car = getCar(),
      records = getRecords();
    camera.updateMatrixWorld();
    matrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(matrix);
    frame++;
    let closeLots = 0;
    for (let i = 0; i < records.length; i++) {
      const r = records[i];
      if (r.isTest) continue;
      if (distanceSquaredToBounds(player.x, player.z, r.bounds) < 14400)
        closeLots++;
    }
    const limit = closeLots ? count : Math.min(count, 4);
    let assigned = false;
    pending = actifs = 0;
    for (let i = 0; i < 40; i++) {
      const p = people[i];
      if (i >= limit) {
        p.active = false;
        continue;
      }
      if (!p.active || shouldRecycle(p.x, p.z, player.x, player.z)) {
        p.active = false;
        if (spawn(p, player, camera, car)) p.lastSim = now;
      }
      if (!p.active) continue;
      if (p.lot && !records.includes(p.lot)) {
        p.lot = null;
        p.path = null;
        p.waiting = true;
        p.stop = 0;
      }
      let dx = p.x - player.x,
        dz = p.z - player.z,
        near = Math.hypot(dx, dz);
      if (near < 0.8 && near > 0.001) {
        const nx = player.x + (dx / near) * 0.85,
          nz = player.z + (dz / near) * 0.85;
        if (safe(nx, nz) && clearOfPeople(p, nx, nz)) {
          p.x = nx;
          p.z = nz;
          p.y = terrainHeight(nx, nz);
        }
      }
      if (car && car.active) {
        const c = Math.cos(car.yaw),
          s = Math.sin(car.yaw),
          rx = p.x - car.x,
          rz = p.z - car.z,
          lx = c * rx - s * rz,
          lz = s * rx + c * rz;
        if (Math.abs(lx) < 1.5 && Math.abs(lz) < 2.6) {
          const shift = (Math.sign(lx) || 1) * 1.55 - lx,
            nx = p.x + c * shift,
            nz = p.z - s * shift;
          if (safe(nx, nz) && clearOfPeople(p, nx, nz)) {
            p.x = nx;
            p.z = nz;
            p.y = terrainHeight(nx, nz);
          }
        }
      }
      dx = p.x - player.x;
      dz = p.z - player.z;
      actifs++;
      p.rank = dx * dx + dz * dz;
      const visible = p.rank < 14400 && inside(p.x, p.z, p.y);
      if (!visible && now < p.nextSim) continue;
      p.nextSim = now + 250;
      const step =
        dt === 0
          ? 0
          : visible
            ? dt
            : Math.min(0.3, Math.max(0, (now - p.lastSim) / 1000));
      p.lastSim = now;
      if (
        p.buddy >= 0 &&
        people[p.buddy].active &&
        people[p.buddy].anim === "walk" &&
        !people[p.buddy].waiting &&
        Math.hypot(people[p.buddy].x - p.x, people[p.buddy].z - p.z) < 10
      ) {
        const leader = people[p.buddy];
        p.pairPoint.x = leader.x + 1.3 * Math.cos(leader.yaw);
        p.pairPoint.z = leader.z - 1.3 * Math.sin(leader.yaw);
        p.pairPath[1] = p.pairPoint;
        p.path = p.pairPath;
        p.index = 1;
        p.lot = leader.lot;
        p.waiting = false;
        p.stop = 0;
        p.anim = "walk";
      }
      if (p.waiting) {
        pending++;
        if (!assigned && !routing) {
          assigned = true;
          routing = true;
          routePerson = p;
          routePlayer = player;
        }
        continue;
      }
      if (p.stop > 0) {
        p.stop -= step;
        let talker = null;
        if (p.lot)
          for (let j = 0; j < limit; j++)
            if (
              j !== i &&
              people[j].active &&
              people[j].lot === p.lot &&
              people[j].stop > 0 &&
              Math.hypot(people[j].x - p.x, people[j].z - p.z) < 5
            ) {
              talker = people[j];
              break;
            }
        if (talker) p.anim = "talk";
        else if (p.anim === "walk") p.anim = "idle";
        if (p.lot) {
          const b = p.lot.bounds,
            tx = talker ? talker.x : (b.min.x + b.max.x) / 2,
            tz = talker ? talker.z : (b.min.z + b.max.z) / 2,
            a = Math.atan2(p.x - tx, p.z - tz);
          p.yaw +=
            Math.atan2(Math.sin(a - p.yaw), Math.cos(a - p.yaw)) *
            Math.min(1, step * 3);
        }
        if (vehicleSideStep(p.x, p.z, car, step, p.evadePoint)) {
          const nx = p.evadePoint.x,
            nz = p.evadePoint.z;
          if (safe(nx, nz) && clearOfPeople(p, nx, nz)) {
            p.x = nx;
            p.z = nz;
            p.y = terrainHeight(nx, nz);
            p.anim = "walk";
          }
        }
        if (p.stop <= 0) p.waiting = true;
        continue;
      }
      if (!p.path || p.index >= p.path.length) {
        p.stop = stopDuration(random);
        p.anim = random() < 0.25 ? "interact" : "idle";
        continue;
      }
      const q = p.path[p.index],
        vx = q.x - p.x,
        vz = q.z - p.z,
        dist = Math.hypot(vx, vz);
      if (dist < 0.65) {
        p.index++;
        continue;
      }
      let sx = vx / dist,
        sz = vz / dist;
      for (let j = 0; j < limit; j++) {
        const other = people[j];
        if (j === i || !other.active) continue;
        const ax = p.x - other.x,
          az = p.z - other.z,
          d2 = ax * ax + az * az;
        if (d2 > 0.0001 && d2 < 1.44) {
          const k = ((1.2 - Math.sqrt(d2)) * 1.4) / Math.sqrt(d2);
          sx += ax * k;
          sz += az * k;
        }
      }
      const pd = Math.hypot(dx, dz);
      if (pd < 1.4 && pd > 0.01) {
        sx += (dx / pd) * (1.4 - pd) * 2;
        sz += (dz / pd) * (1.4 - pd) * 2;
      }
      if (car && car.active) {
        const cx = p.x - car.x,
          cz = p.z - car.z,
          cd = Math.hypot(cx, cz);
        if (cd < 3 && cd > 0.01) {
          sx += (cx / cd) * (3 - cd) * 2;
          sz += (cz / cd) * (3 - cd) * 2;
        }
        if (Math.abs(car.speed) > 0.3 && cd < 10 && cd > 0.01) {
          const approach =
            (-Math.sin(car.yaw) * cx - Math.cos(car.yaw) * cz) *
            Math.sign(car.speed || 1);
          if (approach > 0) {
            const side =
              Math.sign(Math.cos(car.yaw) * cx - Math.sin(car.yaw) * cz) || 1;
            sx += Math.cos(car.yaw) * side * 1.5;
            sz -= Math.sin(car.yaw) * side * 1.5;
          }
        }
      }
      const norm = Math.hypot(sx, sz) || 1,
        nx = p.x + (sx / norm) * p.speed * step,
        nz = p.z + (sz / norm) * p.speed * step;
      if (!safe(nx, nz)) p.waiting = true;
      else if (
        clearOfPeople(p, nx, nz) &&
        outsideCar(nx, nz, car) &&
        Math.hypot(nx - player.x, nz - player.z) > 0.8
      ) {
        p.x = nx;
        p.z = nz;
        p.y = terrainHeight(nx, nz);
      }
      const heading = Math.atan2(-sx, -sz);
      p.yaw +=
        Math.atan2(Math.sin(heading - p.yaw), Math.cos(heading - p.yaw)) *
        Math.min(1, step * 4);
      p.phase += step * p.speed * 5;
    }
    for (let i = 0; i < slots.length; i++) {
      slots[i].owner = -1;
      slots[i].root.visible = false;
    }
    for (let i = 0; i < limit; i++) people[i].slot = -1;
    detailles = 0;
    // Assigner les places disponibles aux personnes visibles les plus proches,
    // en conservant le modèle propre à chaque visiteur.
    for (let n = 0; n < slots.length; n++) {
      const slot = slots[n];
      let best = null;
      for (let i = 0; i < limit; i++) {
        const p = people[i];
        if (!p.active || p.slot >= 0 || p.modelType !== slot.type ||
            p.rank > 14400 || !inside(p.x, p.z, p.y)) continue;
        if (!best || p.rank < best.rank) best = p;
      }
      if (!best) continue;
      best.slot = n;
      slot.owner = best.id;
      slot.root.visible = true;
      slot.root.position.set(best.x, best.y, best.z);
      slot.root.rotation.y = best.yaw + Math.PI;
      slot.root.scale.setScalar(best.scale);
      slot.walk.paused = best.anim !== "walk" || best.waiting;
      slot.walk.setEffectiveTimeScale(best.speed / 1.3);
      slot.elapsed += dt;
      if (best.rank < 625 || frame % 2 === 0) {
        slot.mixer.update(slot.elapsed);
        slot.elapsed = 0;
      }
      detailles++;
    }
    simplifies = 0;
    lastMs = performance.now() - start;
  }
  return {
    update,
    beginFrame() {
      drawCalls = 0;
    },
    setCount(n) {
      count = clamp(Math.round(n), 0, 40);
    },
    setEnabled(v) {
      enabled = !!v;
      if (!enabled) root.visible = false;
    },
    setVisible(v) {
      renderable = !!v;
      root.visible = enabled && renderable;
    },
    setFrozen(v) {
      frozen = !!v;
    },
    setShadows(v) {
      shadows = !!v;
    },
    get statistics() {
      if (!enabled || !renderable)
        return {
          actifs: 0,
          detailles: 0,
          simplifies: 0,
          appelsDessin: 0,
          itinerairesEnAttente: 0,
          msParImage: 0,
        };
      return {
        actifs,
        detailles,
        simplifies,
        appelsDessin: drawCalls,
        itinerairesEnAttente: pending,
        msParImage: Math.round(lastMs * 100) / 100,
      };
    },
    dispose() {
      disposed = true;
      clearInterval(routeTimer);
      scene.remove(root);
      for (const s of slots) {
        s.mixer.stopAllAction();
        s.mixer.uncacheRoot(s.root);
      }

    },
  };
}
