import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { cloneHuman } from "../characters/human.js";
import {
  randomSeed,
  canSpawn,
  shouldRecycle,
  chooseNextLot,
  chooseStop,
  stopDuration,
  vehicleSideStep,
} from "./crowd-logic.js";

const PALETTE = [
  "#778ba2",
  "#a5937e",
  "#536e85",
  "#727e75",
  "#97767b",
  "#5f6476",
  "#8f826c",
  "#7a98a0",
];
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
  const body = new THREE.BoxGeometry(0.45, 1.25, 0.25);
  body.translate(0, 0.78, 0);
  const head = new THREE.SphereGeometry(0.16, 8, 6);
  head.translate(0, 1.56, 0);
  const geometry = mergeGeometries([body, head]);
  body.dispose();
  head.dispose();
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.85,
  });
  const simple = new THREE.InstancedMesh(geometry, material, 40);
  simple.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  root.add(simple);
  const slots = Array.from({ length: 10 }, (_, i) => {
    const model = cloneHuman(THREE, kit, { tint: PALETTE[i % 8] });
    model.root.visible = false;
    root.add(model.root);
    const meshes = [],
      originalMaterials = [];
    model.root.traverse((o) => {
      if (o.isMesh) {
        meshes.push(o);
        originalMaterials.push(
          kit.template.getObjectByName(o.name)?.material || o.material,
        );
      }
    });
    return {
      ...model,
      meshes,
      originalMaterials,
      paletteIndex: i % 8,
      head: model.root.getObjectByName("mixamorig_Head_06"),
      owner: -1,
      state: "",
      elapsed: 0,
    };
  });
  const people = Array.from({ length: 40 }, (_, i) => ({
    evadePoint: { x: 0, z: 0 },
    buddy: i % 5 === 1 ? i - 1 : -1,
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
    color: new THREE.Color(PALETTE[i % 8]),
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
  }));
  for (let i = 0; i < people.length; i++) simple.setColorAt(i, people[i].color);
  if (simple.instanceColor) simple.instanceColor.needsUpdate = true;
  const dummy = new THREE.Object3D(),
    frustum = new THREE.Frustum(),
    matrix = new THREE.Matrix4(),
    point = new THREE.Vector3(),
    direction = new THREE.Vector3(),
    bounds = new THREE.Sphere(new THREE.Vector3(), 1.9);
  const neckAxis = new THREE.Vector3(0, 1, 0),
    neckTurn = new THREE.Quaternion();
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
  simple.onBeforeRender = recordDraw;
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
      const b = r.bounds,
        x = (b.min.x + b.max.x) / 2,
        z = (b.min.z + b.max.z) / 2;
      if (
        (x - player.x) ** 2 + (z - player.z) ** 2 < 14400 &&
        random() < 1 / ++seen
      )
        near = r;
    }
    const cx = near ? (near.bounds.min.x + near.bounds.max.x) / 2 : player.x,
      cz = near ? (near.bounds.min.z + near.bounds.max.z) / 2 : player.z;
    for (let i = 0; i < 14; i++) {
      const a = random() * Math.PI * 2,
        r = near ? 8 + random() * 30 : 25 + random() * 55,
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
  function setAnimation(slot, name, speed) {
    const action = slot.actions[name] || slot.actions.idle;
    if (!action) return;
    if (slot.state !== name) {
      const prev = slot.actions[slot.state];
      action.reset().setEffectiveWeight(1).play();
      if (prev) prev.crossFadeTo(action, 0.2, false);
      slot.state = name;
    }
    if (name === "walk" || name === "walkCasual")
      action.setEffectiveTimeScale(speed / 1.3);
  }
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
      const x = (r.bounds.min.x + r.bounds.max.x) / 2,
        z = (r.bounds.min.z + r.bounds.max.z) / 2;
      if ((x - player.x) ** 2 + (z - player.z) ** 2 < 14400) closeLots++;
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
    for (let n = 0; n < (shadows ? 5 : 10); n++) {
      let best = null;
      for (let i = 0; i < limit; i++) {
        const p = people[i];
        if (!p.active || p.slot >= 0 || p.rank > 2025 || !inside(p.x, p.z, p.y))
          continue;
        if (!best || p.rank < best.rank) best = p;
      }
      if (!best) break;
      best.slot = n;
      slots[n].owner = best.id;
      detailles++;
    }
    let instances = 0;
    for (let i = 0; i < limit; i++) {
      const p = people[i];
      if (!p.active || p.rank >= 14400 || !inside(p.x, p.z, p.y)) continue;
      if (p.slot >= 0) {
        const slot = slots[p.slot];
        slot.root.visible = true;
        slot.root.position.set(p.x, p.y, p.z);
        slot.root.rotation.y = p.yaw + Math.PI;
        slot.root.scale.setScalar(kit.template.scale.x * p.scale);
        const paletteIndex = p.id % 8;
        if (slot.paletteIndex !== paletteIndex) {
          const palette = kit.palettes.get(PALETTE[paletteIndex]);
          for (let j = 0; j < slot.meshes.length; j++)
            slot.meshes[j].material =
              palette?.get(slot.originalMaterials[j]) ||
              slot.originalMaterials[j];
          slot.paletteIndex = paletteIndex;
        }
        for (let j = 0; j < slot.meshes.length; j++)
          slot.meshes[j].castShadow = shadows && p.slot < 6;
        setAnimation(
          slot,
          p.anim === "walk" && p.id % 2 === 0 ? "walkCasual" : p.anim,
          p.speed,
        );
        slot.elapsed += dt;
        if (p.rank < 625 || frame % 2 === 0) {
          slot.mixer.update(slot.elapsed);
          slot.elapsed = 0;
          if (slot.head && p.lot && p.stop > 0 && p.anim !== "talk") {
            const b = p.lot.bounds,
              tx = (b.min.x + b.max.x) * 0.5 - p.x,
              tz = (b.min.z + b.max.z) * 0.5 - p.z,
              target = Math.atan2(-tx, -tz),
              delta = Math.atan2(
                Math.sin(target - p.yaw),
                Math.cos(target - p.yaw),
              );
            p.headTurn +=
              (clamp(delta, -Math.PI / 3, Math.PI / 3) - p.headTurn) *
              Math.min(1, dt * 4);
            neckTurn.setFromAxisAngle(neckAxis, p.headTurn);
            slot.head.quaternion.multiply(neckTurn);
          } else p.headTurn = 0;
        }
      } else {
        dummy.position.set(p.x, p.y, p.z);
        dummy.rotation.set(0, p.yaw, Math.sin(p.phase) * 0.035);
        dummy.scale.setScalar(p.scale);
        dummy.updateMatrix();
        simple.setMatrixAt(instances, dummy.matrix);
        simple.setColorAt(instances, p.color);
        instances++;
      }
    }
    simple.count = instances;
    simple.instanceMatrix.needsUpdate = true;
    if (simple.instanceColor) simple.instanceColor.needsUpdate = true;
    simplifies = instances;
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
      for (const palette of kit.palettes?.values() || [])
        for (const m of palette.values()) m.dispose();
      kit.palettes?.clear();
      geometry.dispose();
      material.dispose();
      simple.dispose();
    },
  };
}
