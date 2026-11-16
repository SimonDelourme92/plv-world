// PLV destructibles en voiture : les exemplaires touchés sortent de leur InstancedMesh,
// deviennent des débris physiques simples (gravité, rebond, frottement, mise à plat),
// puis reviennent à leur place après un moment. Un gros choc déclenche un ralenti
// avec caméra cinéma (façon Burnout). Aucune donnée n'est modifiée ni sauvegardée.

const MAX_BODIES = 320; // plafond de débris actifs
const LIFE = 16; // secondes avant remise en place
const SLOWMO_SPEED = 8; // m/s (~29 km/h) pour déclencher le ralenti
const SLOWMO_HITS = 3; // exemplaires touchés minimum pour le ralenti
const SLOWMO_REAL = 2.8; // durée réelle du ralenti (s)
const COOLDOWN = 5; // secondes entre deux ralentis
const CAR_HALF_W = 1.09, CAR_HALF_L = 2.39, CAR_H = 1.5;

// Masses (kg) : voiture et PLV vides (carton ou métal léger), estimées d'après le volume de la boîte englobante.
export const CAR_MASS = 1500, RACK_MASS = 12;
export const plvMass = lc => Math.min(25, Math.max(0.2, 8 * lc.hx * lc.hy * lc.hz * 12));

export function createCrash({ THREE, scene, records, terrainHeight, unitBox, getVolume = () => 1 }) {
  const root = new THREE.Group();
  root.name = "crash-debris";
  scene.add(root);
  const bodies = [];
  const caches = new WeakMap();
  const tmpM = new THREE.Matrix4(), tmpT = new THREE.Matrix4();
  const qa = new THREE.Quaternion(), qb = new THREE.Quaternion(), va = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const zero = new THREE.Matrix4().makeScale(0, 0, 0);
  const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.08, 2000);
  camera.rotation.order = "YXZ";
  let cinematic = null, cooldown = 0, total = 0, burst = 0, burstTimer = 0, lastSound = 0;
  const overlay = makeOverlay();

  // ---- cache des instances (positions monde, demi-tailles, matrices d'origine)
  function lotCache(r) {
    let c = caches.get(r);
    if (c) return c;
    const arr = r.matrixCarrier.instanceMatrix.array, q = r.q, s = r.instSize || { l: 0.4, p: 0.4, h: 0.4 };
    const o = r.near.position, pts = new Float32Array(q * 3);
    for (let i = 0; i < q; i++) {
      pts[i * 3] = o.x + arr[i * 16 + 12];
      pts[i * 3 + 1] = o.y + arr[i * 16 + 13];
      pts[i * 3 + 2] = o.z + arr[i * 16 + 14];
    }
    c = { kind: "lot", r, pts, orig: arr.slice(0, q * 16), gone: new Uint8Array(q), hx: s.l / 2, hy: s.h / 2, hz: s.p / 2, attr: r.matrixCarrier.instanceMatrix };
    caches.set(r, c);
    return c;
  }
  function rackCaches(r) {
    let list = caches.get(r.rack);
    if (list) return list;
    list = [];
    for (const m of r.rack.children) {
      if (!m.isInstancedMesh) continue;
      const n = m.count, arr = m.instanceMatrix.array, pts = new Float32Array(n * 6);
      for (let i = 0; i < n; i++) {
        const k = i * 16;
        pts.set([arr[k + 12], arr[k + 13], arr[k + 14], Math.abs(arr[k]) / 2, Math.abs(arr[k + 5]) / 2, Math.abs(arr[k + 10]) / 2], i * 6);
      }
      list.push({ kind: "rack", mesh: m, n, pts, orig: arr.slice(0, n * 16), gone: new Uint8Array(n), attr: m.instanceMatrix });
    }
    caches.set(r.rack, list);
    return list;
  }

  // ---- test boîte orientée (voiture) contre boîte alignée (exemplaire)
  function hitsCar(x, z, c, sn, bx, bz, hx, hz, grow) {
    const a = Math.abs(c), b = Math.abs(sn), dx = bx - x, dz = bz - z;
    const W = CAR_HALF_W + grow, L = CAR_HALF_L + grow;
    if (Math.abs(dx) >= a * W + b * L + hx || Math.abs(dz) >= b * W + a * L + hz) return false;
    if (Math.abs(c * dx - sn * dz) >= W + a * hx + b * hz) return false;
    if (Math.abs(sn * dx + c * dz) >= L + b * hx + a * hz) return false;
    return true;
  }

  // ---- création d'un débris à partir d'une instance
  function spawn(cache, i, source, carState, gentle) {
    if (bodies.length >= MAX_BODIES) restore(bodies[0]);
    const obj = new THREE.Group();
    let hx, hy, hz;
    if (cache.kind === "lot") {
      for (const m of cache.r.near.children) if (m.isInstancedMesh || m.isMesh) obj.add(new THREE.Mesh(m.geometry, m.material));
      tmpM.fromArray(cache.orig, i * 16);
      const o = cache.r.near.position;
      tmpM.premultiply(tmpT.makeTranslation(o.x, o.y, o.z));
      hx = cache.hx; hy = cache.hy; hz = cache.hz;
    } else {
      obj.add(new THREE.Mesh(unitBox, cache.mesh.material));
      tmpM.fromArray(cache.orig, i * 16);
      hx = cache.pts[i * 6 + 3]; hy = cache.pts[i * 6 + 4]; hz = cache.pts[i * 6 + 5];
    }
    tmpM.decompose(obj.position, obj.quaternion, obj.scale);
    root.add(obj);
    cache.gone[i] = 1;
    cache.attr.array.set(zero.elements, i * 16);
    cache.attr.needsUpdate = true;
    const body = { obj, cache, i, hx, hy, hz, v: new THREE.Vector3(), w: new THREE.Vector3(), age: 0, rest: 0, home: new THREE.Vector3().copy(obj.position) };
    kick(body, carState, gentle);
    bodies.push(body);
    return body;
  }
  function kick(body, car, gentle) {
    const s = Math.abs(car.speed), fx = -Math.sin(car.yaw) * Math.sign(car.speed || 1), fz = -Math.cos(car.yaw) * Math.sign(car.speed || 1);
    const vol = Math.max(0.002, 8 * body.hx * body.hy * body.hz), light = Math.min(1.8, Math.max(0.55, 0.12 / Math.cbrt(vol)));
    if (gentle) {
      body.v.set((Math.random() - 0.5) * 1.2, Math.random() * 0.6, (Math.random() - 0.5) * 1.2);
      body.w.set((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3);
      return;
    }
    const dx = body.obj.position.x - car.x, dz = body.obj.position.z - car.z;
    const side = Math.sign(dx * Math.cos(car.yaw) - dz * Math.sin(car.yaw)) || 1;
    const rx = Math.cos(car.yaw) * side, rz = -Math.sin(car.yaw) * side;
    const push = s * (1.05 + Math.random() * 0.45) * light, lat = s * (0.12 + Math.random() * 0.35) * light;
    body.v.set(fx * push + rx * lat, (1.4 + s * (0.16 + Math.random() * 0.22)) * light, fz * push + rz * lat);
    const spin = (2 + s * 0.55) * light;
    body.w.set((Math.random() - 0.5) * spin * 2, (Math.random() - 0.5) * spin, (Math.random() - 0.5) * spin * 2);
    body.rest = 0;
  }
  function restore(body) {
    const k = bodies.indexOf(body);
    if (k >= 0) bodies.splice(k, 1);
    body.obj.removeFromParent();
    const c = body.cache;
    if (c.gone[body.i]) {
      c.gone[body.i] = 0;
      c.attr.array.set(c.orig.subarray(body.i * 16, body.i * 16 + 16), body.i * 16);
      c.attr.needsUpdate = true;
    }
  }

  // ---- appelé après chaque pas de conduite : renvoie le facteur de vitesse conservée
  function impact(x, z, yaw, speed) {
    const s = Math.abs(speed);
    if (s < 0.8) return 1;
    const c = Math.cos(yaw), sn = Math.sin(yaw), car = { x, z, yaw, speed };
    const reach = CAR_HALF_L + 1.5;
    let hitMass = 0, hits = 0;
    for (const r of records) {
      if (r.isTest || r.level < 0) continue;
      const b = r.bounds;
      if (x + reach < b.min.x || x - reach > b.max.x || z + reach < b.min.z || z - reach > b.max.z) continue;
      const lc = lotCache(r);
      let rackHit = false;
      if (r.rack) {
        for (const rc of rackCaches(r)) {
          for (let i = 0; i < rc.n; i++) {
            if (rc.gone[i]) continue;
            const p = rc.pts, k = i * 6;
            if (p[k + 1] - p[k + 4] > CAR_H) continue;
            if (!hitsCar(x, z, c, sn, p[k], p[k + 2], p[k + 3], p[k + 5], 0.05)) continue;
            spawn(rc, i, r, car, false);
            rackHit = true;
            hitMass += RACK_MASS;
          }
        }
      }
      for (let i = 0; i < r.q; i++) {
        if (lc.gone[i]) continue;
        const p = lc.pts, k = i * 3, low = p[k + 1] - lc.hy;
        const direct = low < CAR_H && hitsCar(x, z, c, sn, p[k], p[k + 2], lc.hx, lc.hz, 0.04);
        // un rack touché lâche aussi ce qu'il porte autour du point d'impact
        const loose = !direct && rackHit && low > 0.05 && hitsCar(x, z, c, sn, p[k], p[k + 2], lc.hx, lc.hz, 0.9);
        if (!direct && !loose) continue;
        spawn(lc, i, r, car, loose);
        if (direct) {
          hits++;
          hitMass += plvMass(lc);
        }
      }
    }
    // les débris au sol se font re-percuter
    if (s > 2) for (const body of bodies) {
      const p = body.obj.position;
      if (Math.abs(p.x - x) > 4 || Math.abs(p.z - z) > 4 || p.y - terrainHeight(p.x, p.z) > CAR_H) continue;
      if (!hitsCar(x, z, c, sn, p.x, p.z, body.hx, body.hz, 0)) continue;
      if (body.v.lengthSq() > s * s * 0.8) continue;
      kick(body, car, false);
    }
    if (hits) {
      total += hits;
      burst += hits;
      burstTimer = 0.35;
      crashSound(hits, s);
      if (!cinematic && cooldown <= 0 && s >= SLOWMO_SPEED && burst >= SLOWMO_HITS) startCinematic(car);
      if (cinematic) cinematic.count += hits;
    }
    // Choc mou : la voiture (≈ 1,5 t) emporte ce qu'elle percute. Quantité de mouvement conservée :
    // v' = v · M / (M + m). Une colonne vide de 3 kg ne coûte que 0,2 % de vitesse.
    return hitMass ? CAR_MASS / (CAR_MASS + hitMass) : 1;
  }

  // ---- physique des débris (dt déjà ralenti)
  function update(dt, realDt, car) {
    if (cooldown > 0 && !cinematic) cooldown -= realDt;
    if (burstTimer > 0 && (burstTimer -= realDt) <= 0) burst = 0;
    for (let n = bodies.length - 1; n >= 0; n--) {
      const b = bodies[n], o = b.obj, p = o.position, q = o.quaternion;
      b.age += dt;
      if (b.age > LIFE && (!car || Math.hypot(b.home.x - car.x, b.home.z - car.z) > 7)) { restore(b); continue; }
      b.v.y -= 9.81 * dt;
      p.addScaledVector(b.v, dt);
      const wl = b.w.length();
      if (wl > 1e-4) { qa.setFromAxisAngle(va.copy(b.w).divideScalar(wl), wl * dt); q.premultiply(qa).normalize(); }
      const x = q.x, y = q.y, z = q.z, w = q.w;
      const r10 = 2 * (x * y + w * z), r11 = 1 - 2 * (x * x + z * z), r12 = 2 * (y * z - w * x);
      const ext = Math.abs(r10) * b.hx + Math.abs(r11) * b.hy + Math.abs(r12) * b.hz, ground = terrainHeight(p.x, p.z);
      if (p.y - ext <= ground) {
        p.y = ground + ext;
        if (b.v.y < 0) b.v.y = b.v.y < -2 ? -b.v.y * 0.28 : 0;
        const f = Math.exp(-dt * 4.5);
        b.v.x *= f; b.v.z *= f;
        b.w.multiplyScalar(Math.exp(-dt * 5));
        // se couche sur sa face la plus proche
        if (b.v.lengthSq() < 4) {
          const ax = [Math.abs(r10), Math.abs(r11), Math.abs(r12)], k = ax.indexOf(Math.max(...ax));
          va.set(k === 0 ? 1 : 0, k === 1 ? 1 : 0, k === 2 ? 1 : 0).applyQuaternion(q);
          if (va.y < 0) va.negate();
          qb.setFromUnitVectors(va, up);
          qa.identity().slerp(qb, Math.min(1, dt * 5));
          q.premultiply(qa).normalize();
          b.rest += dt;
        }
      }
    }
    if (cinematic) updateCinematic(realDt, car);
  }

  // ---- ralenti + caméra cinéma
  function startCinematic(car) {
    const side = Math.random() < 0.5 ? -1 : 1, fx = -Math.sin(car.yaw), fz = -Math.cos(car.yaw);
    const base = Math.atan2(Math.cos(car.yaw) * side + fz * 0.25, -Math.sin(car.yaw) * side + fx * 0.25);
    cinematic = { t: 0, side, base, center: new THREE.Vector3(car.x + fx * 2, 0, car.z + fz * 2), count: 0 };
    overlay.show();
  }
  function updateCinematic(realDt, car) {
    const k = cinematic;
    k.t += realDt;
    const u = Math.min(1, k.t / SLOWMO_REAL);
    if (car) k.center.lerp(va.set(car.x - Math.sin(car.yaw) * 2, 0, car.z - Math.cos(car.yaw) * 2), Math.min(1, realDt * 1.2));
    const ang = k.base + k.side * u * 1.15, R = 8 - u * 1.8;
    const gy = terrainHeight(k.center.x, k.center.z);
    camera.position.set(k.center.x + Math.cos(ang) * R, gy + 3.4 + u * 0.8, k.center.z + Math.sin(ang) * R);
    camera.lookAt(k.center.x, gy + 0.7, k.center.z);
    camera.fov = 52 - u * 6;
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    overlay.text(k.count, total);
    if (k.t >= SLOWMO_REAL) endCinematic();
  }
  function endCinematic() {
    if (!cinematic) return;
    cinematic = null;
    cooldown = COOLDOWN;
    overlay.hide();
  }
  function timeScale() {
    if (!cinematic) return 1;
    const t = cinematic.t;
    if (t < 0.12) return 1 - t / 0.12 * 0.85;
    if (t < SLOWMO_REAL - 0.6) return 0.15;
    return 0.15 + (t - (SLOWMO_REAL - 0.6)) / 0.6 * 0.85;
  }

  // ---- son de choc (bruit filtré + coup sourd)
  let ctx = null, noise = null;
  function crashSound(hits, speed) {
    const vol = getVolume();
    if (!vol) return;
    const now = performance.now();
    if (now - lastSound < 70) return;
    lastSound = now;
    try {
      ctx ??= new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === "suspended") ctx.resume();
      if (!noise) {
        noise = ctx.createBuffer(1, ctx.sampleRate * 0.6, ctx.sampleRate);
        const d = noise.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2.2);
      }
      const t = ctx.currentTime, g = ctx.createGain(), amp = Math.min(0.9, (0.18 + hits * 0.06) * Math.min(1, speed / 14)) * vol;
      const src = ctx.createBufferSource(), bp = ctx.createBiquadFilter();
      src.buffer = noise;
      src.playbackRate.value = 0.6 + Math.random() * 0.5;
      bp.type = "bandpass";
      bp.frequency.value = 900 + Math.random() * 1600;
      bp.Q.value = 0.7;
      g.gain.setValueAtTime(amp, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
      const o = ctx.createOscillator(), og = ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(110, t);
      o.frequency.exponentialRampToValueAtTime(38, t + 0.25);
      og.gain.setValueAtTime(amp * 0.9, t);
      og.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      src.connect(bp).connect(g).connect(ctx.destination);
      o.connect(og).connect(ctx.destination);
      src.start(t); src.stop(t + 0.6);
      o.start(t); o.stop(t + 0.32);
      src.onended = () => { src.disconnect(); bp.disconnect(); g.disconnect(); };
      o.onended = () => { o.disconnect(); og.disconnect(); };
    } catch {}
  }

  function clear() {
    endCinematic();
    for (let n = bodies.length - 1; n >= 0; n--) restore(bodies[n]);
  }

  function makeOverlay() {
    const el = document.createElement("div");
    el.className = "crash-cine";
    el.hidden = true;
    el.innerHTML = '<div class="crash-bar crash-top"></div><div class="crash-bar crash-bottom"></div><div class="crash-title"><b>CRASH !</b><span></span></div>';
    const style = document.createElement("style");
    style.textContent = `.crash-cine{position:fixed;inset:0;pointer-events:none;z-index:60}
body.crash-on #vehicleHUD,body.crash-on #lotFocus,body.crash-on #hud,body.crash-on #bottom,body.crash-on #miniMap,body.crash-on #toolbar,body.crash-on #cross,body.crash-on #masterSoundControl,body.crash-on #gpsPanel{visibility:hidden}
.crash-bar{position:absolute;left:0;right:0;height:11vh;background:#000;transition:transform .25s ease}
.crash-top{top:0}.crash-bottom{bottom:0}
.crash-title{position:absolute;left:0;right:0;bottom:13vh;text-align:center;color:#fff;font:italic 900 clamp(34px,7vw,86px)/1 system-ui,sans-serif;letter-spacing:.02em;text-shadow:0 4px 0 #d8261c,0 8px 22px rgba(0,0,0,.6);animation:crashPop .35s cubic-bezier(.2,1.6,.4,1)}
.crash-title span{display:block;margin-top:8px;font:800 clamp(14px,2vw,22px)/1.2 system-ui,sans-serif;letter-spacing:.08em;text-shadow:0 2px 8px #000}
@keyframes crashPop{from{transform:scale(2.2);opacity:0}to{transform:scale(1);opacity:1}}`;
    document.head.append(style);
    document.body.append(el);
    const span = el.querySelector("span");
    return {
      show() { el.hidden = false; document.body.classList.add("crash-on"); const t = el.querySelector(".crash-title"); t.style.animation = "none"; void t.offsetWidth; t.style.animation = ""; },
      hide() { el.hidden = true; document.body.classList.remove("crash-on"); },
      text(n, all) { span.textContent = `${n} PLV pulvérisée${n > 1 ? "s" : ""} · total ${all}`; },
    };
  }

  return {
    impact, update, clear, endCinematic, camera,
    get timeScale() { return timeScale(); },
    get cinematic() { return !!cinematic; },
    get total() { return total; },
    get debris() { return bodies.length; },
  };
}
