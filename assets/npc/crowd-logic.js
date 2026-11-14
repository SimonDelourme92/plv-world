// Fonctions pures pour la circulation des visiteurs.
export function randomSeed(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
export function shouldRecycle(x, z, playerX, playerZ, maxDistance = 160) {
  return (x - playerX) ** 2 + (z - playerZ) ** 2 > maxDistance ** 2;
}
export function canSpawn(x, z, playerX, playerZ, isVisible) {
  return (x - playerX) ** 2 + (z - playerZ) ** 2 > 35 ** 2 || !isVisible(x, z);
}
export function chooseNextLot(
  records,
  history,
  playerX,
  playerZ,
  random,
  radius = 120,
) {
  let choice = null,
    count = 0;
  for (const record of records) {
    if (record.isTest || history.includes(record.lot.id)) continue;
    const b = record.bounds,
      x = (b.min.x + b.max.x) / 2,
      z = (b.min.z + b.max.z) / 2;
    if ((x - playerX) ** 2 + (z - playerZ) ** 2 > radius ** 2) continue;
    if (random() < 1 / ++count) choice = record;
  }
  return choice;
}
export function chooseStop(
  bounds,
  obstacles,
  terrainHeight,
  waterLevel,
  random,
  gap = 1.7,
) {
  const x = (bounds.min.x + bounds.max.x) / 2,
    z = (bounds.min.z + bounds.max.z) / 2;
  const options = [
    { x, z: bounds.min.z - gap },
    { x, z: bounds.max.z + gap },
    { x: bounds.min.x - gap, z },
    { x: bounds.max.x + gap, z },
  ];
  const start = Math.floor(random() * options.length);
  for (let i = 0; i < options.length; i++) {
    const p = options[(start + i) % options.length];
    if (terrainHeight(p.x, p.z) < waterLevel + 0.15) continue;
    if (
      obstacles.some(
        (b) =>
          p.x > b.min.x - 0.6 &&
          p.x < b.max.x + 0.6 &&
          p.z > b.min.z - 0.6 &&
          p.z < b.max.z + 0.6,
      )
    )
      continue;
    return p;
  }
  return null;
}
export function stopDuration(random) {
  return 3 + 5 * random();
}
// Écart latéral prévisible ; `out` est réutilisé par le visiteur.
export function vehicleSideStep(x, z, car, dt, out) {
  if (!car?.active || Math.abs(car.speed) <= 0.3) return false;
  const dx = x - car.x,
    dz = z - car.z,
    d = Math.hypot(dx, dz);
  if (d >= 10 || d < 0.01) return false;
  const forward =
    (-Math.sin(car.yaw) * dx - Math.cos(car.yaw) * dz) * Math.sign(car.speed);
  if (forward <= 0 && d >= 3) return false;
  const side = Math.sign(Math.cos(car.yaw) * dx - Math.sin(car.yaw) * dz) || 1;
  out.x = x + Math.cos(car.yaw) * side * dt * 2.2;
  out.z = z - Math.sin(car.yaw) * side * dt * 2.2;
  return true;
}
