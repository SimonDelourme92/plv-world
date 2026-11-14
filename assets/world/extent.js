// Keep all existing lots reachable while starting with a smaller domain.
// minHalf : emprise minimale imposée par le paysage (réseau routier), 500 m sinon.
export function calculatePlayableHalf(records, position, maxHalf = 1000, minHalf = 500) {
  let extent = Math.max(minHalf, Math.abs(position.x) + 10, Math.abs(position.z) + 10);
  for (const { bounds: b } of records) {
    extent = Math.max(extent, Math.abs(b.min.x) + 70, Math.abs(b.max.x) + 70, Math.abs(b.min.z) + 70, Math.abs(b.max.z) + 70);
  }
  return Math.min(maxHalf, Math.ceil(extent / 100) * 100);
}
