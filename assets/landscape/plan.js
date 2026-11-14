// Emprises maximales (houppiers compris), en mètres. Aucune réservation PLV modifiée.
export const SIZES = {
  pin: [5.72842, 7.37624, 5.72842],
  "arbre-feuillu": [4.24129, 9.42519, 4.24129],
  buisson: [1.96514, 1.58179, 1.96514],
  "pavillon-astra": [8.90338, 6.03001, 8.90338],
  "hangar-vitre": [18, 7.7044, 18],
};
export function createPlantingPlan() {
  const result = [];
  function add(id, x, z, scale = 1, y = 0, rotation = 0, zone = "central") {
    const i = result.length,
      variation = id === "pin" || id === "arbre-feuillu" || id === "buisson";
    // Variation déterministe, indépendante de l'inventaire et de Math.random.
    const s = scale * (variation ? 0.92 + 0.08 * Math.sin(i * 2.399) : 1);
    const [width, h, depth] = SIZES[id],
      angle = variation ? i * 2.399 : rotation;
    const w = variation
        ? Math.abs(Math.cos(angle)) * width + Math.abs(Math.sin(angle)) * depth
        : width,
      d = variation
        ? Math.abs(Math.sin(angle)) * width + Math.abs(Math.cos(angle)) * depth
        : depth;
    result.push({
      id,
      x,
      z,
      y,
      scale: s,
      rotation: variation ? i * 2.399 : rotation,
      zone,
      radius: (Math.hypot(w, d) * s) / 2,
      bounds: {
        min: { x: x - (w * s) / 2, y, z: z - (d * s) / 2 },
        max: { x: x + (w * s) / 2, y: y + h * s, z: z + (d * s) / 2 },
      },
    });
  }
  // Deux mails de pins encadrent la traversée nord-sud ; passages libres entre les groupes.
  for (const x of [38, 62])
    for (const z of [8, 17, 83, 92])
      add(
        "pin",
        x === 62 && z < 30 ? 59 : x,
        z,
        x === 62 && z < 30 ? 0.48 : 0.85,
      );
  // Jardins existants : houppiers contenus dans les bacs, arbres remplacés après chargement.
  for (const [x, z, w] of [
    [29, 31, 10],
    [67, 30, 12],
    [31, 75, 7],
    [70, 76, 7],
  ]) {
    for (const s of [-1, 0, 1])
      add("arbre-feuillu", x + s * w * 0.29, z, 0.56, 0.68);
    for (let k = -3; k <= 3; k++)
      add("buisson", x + k * w * 0.115, z + 1.55, 0.42, 0.68);
  }
  // Bosquets composés et lisières basses ; aucun objet sur la croix de circulation.
  for (const [x, z] of [
    [8, 69],
    [32, 65],
    [67, 87],
    [90, 70],
  ]) {
    add("arbre-feuillu", x, z, 0.75);
    add("pin", x + (x === 8 ? 2 : 3), z - 3, 0.55);
    for (let k = 0; k < 5; k++) add("buisson", x - 2 + k, z + 2, 0.65);
  }
  for (const x of [40, 60])
    for (const z of [8, 12, 16, 20, 80, 84, 88, 92]) add("buisson", x, z, 0.55);
  add("hangar-vitre", 18, 64, 0.6, 0, 0);
  add("pavillon-astra", 81, 65, 1, 0, Math.PI);
  add("pavillon-astra", 31, 88, 0.8, 0, 0);
  // Bordures de 0,6 m entre route (4 m) et réservation PLV (4,6 m).
  // Les pins adultes ne peuvent pas y tenir sans empiéter sur la capacité d'exposition.
  for (let iz = -2; iz <= 2; iz++)
    for (let ix = -2; ix <= 2; ix++) {
      if ((ix === 0 && iz === 0) || (ix === 0 && iz === -1)) continue; // place et cellule de test 50 000
      const x = ix * 100,
        z = iz * 100;
      for (const t of [18, 22, 26, 30, 66, 70, 74, 78]) {
        add("buisson", x + 4.3, z + t, 0.18, 0, 0, "bordure");
        add("buisson", x + 95.7, z + t, 0.18, 0, 0, "bordure");
        add("buisson", x + t, z + 4.3, 0.18, 0, 0, "bordure");
        add("buisson", x + t, z + 95.7, 0.18, 0, 0, "bordure");
      }
    }
  return result;
}
