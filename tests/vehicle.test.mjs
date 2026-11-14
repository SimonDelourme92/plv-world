import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
import { SedanDynamics } from "../assets/vehicles/dynamics.js";
const drive = (d, seconds, input, blocked = () => false, dt = 1 / 60) => {
  for (let t = 0; t < seconds; t += dt) d.step(dt, input, blocked);
};
test("Accélération progressive, freinage, marche arrière et limites", () => {
  const d = new SedanDynamics();
  drive(d, 0.2, { forward: true });
  assert(d.speed > 0 && d.speed < 0.6);
  drive(d, 20, { forward: true });
  assert(d.speed > 23 && d.speed <= 30.56);
  assert(d.gear >= 2 && d.rpm < 6500);
  const fast = d.speed;
  drive(d, 1, { reverse: true });
  assert(d.speed < fast - 9);
  drive(d, 5, { reverse: true });
  assert(d.speed < 0 && d.speed >= -7);
  assert.equal(d.gear, -1);
});
test("Direction adaptée à la vitesse, dérapage limité, frein à main et patinage", () => {
  const slow = new SedanDynamics();
  slow.speed = 3;
  drive(slow, 0.7, { forward: true, turn: 1 });
  const fast = new SedanDynamics();
  fast.speed = 25;
  drive(fast, 0.7, { forward: true, turn: 1 });
  assert(Math.abs(fast.steer) < Math.abs(slow.steer));
  assert(fast.lateral < 0 && Math.abs(fast.lateral) <= 4);
  const v = fast.speed;
  drive(fast, 1, { handbrake: true, turn: 1 });
  assert(fast.speed < v - 6 && fast.slip > 0);
  const b = new SedanDynamics();
  drive(b, 2, { forward: true, handbrake: true });
  assert(
    Math.abs(b.speed) < 0.4 &&
      b.rpm > 3500 &&
      b.slip > 0.5 &&
      Math.abs(b.wheelAngle) > 1,
  );
});
test("Collisions subdivisées : arrêt avant une paroi à haute vitesse", () => {
  const d = new SedanDynamics();
  d.speed = 38;
  let calls = 0;
  drive(d, 1, { forward: true, boost: true }, (x, z) => {
    calls++;
    return z < -7.6;
  });
  assert(d.z >= -7.6 && d.z < -7.1);
  assert.equal(d.speed, 0);
  assert(calls > 20);
});
test("Intégration stable à 30 et 60 Hz, roues et réinitialisation", () => {
  const a = new SedanDynamics(),
    b = new SedanDynamics();
  drive(a, 8, { forward: true }, undefined, 1 / 60);
  drive(b, 8, { forward: true }, undefined, 1 / 30);
  assert(Math.abs(a.speed - b.speed) < 0.2);
  assert(Math.abs(a.z - b.z) < 1);
  assert.notEqual(a.wheelAngle, 0);
  a.reset(4, 9, 1);
  assert.equal(a.speed, 0);
  assert.equal(a.lateral, 0);
  assert.equal(a.gear, 1);
  assert.equal(a.x, 4);
});
test("Assets locaux : intégrité, roues séparées, matériaux, licence, budget", () => {
  const m = JSON.parse(
    fs.readFileSync(
      new URL("../assets/vehicles/manifest.json", import.meta.url),
    ),
  );
  assert.equal(m.models[0].license, "CC-BY-4.0");
  let total = 0;
  for (const lod of m.models[0].lods) {
    const bytes = fs.readFileSync(new URL("../" + lod.path, import.meta.url));
    total += bytes.length;
    assert.equal(bytes.length, lod.bytes);
    assert.equal(
      crypto.createHash("sha256").update(bytes).digest("hex"),
      lod.sha256,
    );
    const g = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)));
    for (const n of [
      "wheel_FL",
      "wheel_FR",
      "wheel_RL",
      "wheel_RR",
      "steer_FL",
      "steer_FR",
    ])
      assert(
        g.nodes.some((v) => v.name === n),
        n,
      );
    for (const n of ["Headlights", "Tail lamps", "Tinted blue glass"])
      assert(g.materials.some((m) => m.name === n));
    assert(g.asset.copyright.includes("Comrade1280"));
    for (const v of [...g.buffers, ...g.images]) assert(!v.uri);
    assert(g.extensionsRequired.includes("EXT_meshopt_compression"));
  }
  assert(total < 700000);
  const audio = JSON.parse(
    fs.readFileSync(
      new URL("../assets/audio/vehicle/manifest.json", import.meta.url),
    ),
  );
  assert.equal(audio.license, "CC0-1.0");
  for (const f of audio.files) {
    const b = fs.readFileSync(new URL("../" + f.path, import.meta.url));
    assert.equal(b.subarray(0, 4).toString(), "OggS");
    assert.equal(crypto.createHash("sha256").update(b).digest("hex"), f.sha256);
    assert.equal(b.length, f.bytes);
  }
});
