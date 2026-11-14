import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { AssetLibrary } from "./manager.js";
const $ = (id) => document.getElementById(id),
  library = new AssetLibrary(),
  siteRoot = new URL("../../", import.meta.url);
const labels = {
  skyline: "Skyline",
  relief: "Reliefs",
  aeronef: "Avions et navettes",
  pavillon: "Pavillons",
  vegetation: "Végétation",
};
let manifest,
  current = null,
  model = null,
  selection = null,
  revision = 0;
const buttons = new Map();
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
$("viewer").append(renderer.domElement);
const scene = new THREE.Scene(),
  camera = new THREE.PerspectiveCamera(38, 1, 0.01, 10000),
  controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = false;
scene.add(new THREE.HemisphereLight("#e9f5ff", "#57606c", 2.8));
const key = new THREE.DirectionalLight("#fff1dc", 3.3),
  fill = new THREE.DirectionalLight("#b9dfef", 1.5);
key.position.set(8, 12, 5);
fill.position.set(-6, 4, -8);
scene.add(key, fill);
const grid = new THREE.GridHelper(100, 20, "#516775", "#273b4b");
grid.material.transparent = true;
grid.material.opacity = 0.22;
scene.add(grid);
function render() {
  renderer.render(scene, camera);
}
controls.addEventListener("change", render);
new ResizeObserver(() => {
  const host = $("viewer");
  const w = host.clientWidth,
    h = host.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  render();
}).observe($("viewer"));
function frame() {
  if (!model) return;
  const b = new THREE.Box3().setFromObject(model),
    center = b.getCenter(new THREE.Vector3()),
    size = b.getSize(new THREE.Vector3()),
    radius = size.length() * 0.5,
    distance = radius / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2));
  camera.near = Math.max(0.001, distance / 1000);
  camera.far = distance * 20;
  camera.position
    .copy(center)
    .add(new THREE.Vector3(1, 0.55, 1.35).normalize().multiplyScalar(distance));
  camera.updateProjectionMatrix();
  controls.target.copy(center);
  controls.minDistance = radius * 0.25;
  controls.maxDistance = distance * 5;
  controls.update();
  grid.scale.setScalar(Math.max(...size.toArray()) / 65);
  grid.position.y = b.min.y - radius * 0.005;
  render();
}
function link(href, label) {
  const a = document.createElement("a");
  a.href = href;
  a.textContent = label;
  a.target = "_blank";
  a.rel = "noopener";
  return a;
}
async function select(id) {
  selection = id;
  const token = ++revision;
  for (const [key, button] of buttons)
    button.classList.toggle("active", key === id);
  $("loadStatus").textContent = "Chargement du modèle…";
  try {
    const handle = await library.acquire(id, Number($("lod").value));
    if (token !== revision) {
      handle.release();
      return;
    }
    if (model) scene.remove(model);
    current?.release();
    current = handle;
    model = handle.scene.clone(true);
    scene.add(model);
    const a = handle.asset,
      l = handle.lod,
      p = manifest.providers[a.provider];
    $("assetName").textContent = a.name;
    $("usage").textContent =
      a.usage === "horizon"
        ? "Utilisé dans l’horizon."
        : "En réserve pour une prochaine composition : aucun placement automatique dans le monde.";
    $("dimensions").textContent =
      a.dimensions
        .map((v) => v.toLocaleString("fr-FR", { maximumFractionDigits: 2 }))
        .join(" × ") + " m";
    $("weight").textContent =
      (l.bytes / 1024).toLocaleString("fr-FR", { maximumFractionDigits: 1 }) +
      " Ko · " +
      l.triangles.toLocaleString("fr-FR") +
      " triangles · LOD " +
      l.level;
    $("source").replaceChildren(link(a.sourceUrl, p.name));
    $("license").replaceChildren(
      link(p.licenseUrl, a.license + " — " + p.author),
    );
    $("changes").textContent = a.changes.join(" ; ");
    $("modelFile").href = new URL(l.path, siteRoot).href;
    $("loadStatus").textContent =
      a.provider === "amvlab"
        ? "Modèle amvlab · CC BY 4.0 · adapté pour PLV WORLD."
        : "Modèle prêt.";
    frame();
  } catch (error) {
    if (token === revision)
      $("loadStatus").textContent = "Chargement impossible : " + error.message;
  }
}
try {
  manifest = await library.getManifest();
  const t = manifest.totals;
  $("summary").textContent =
    t.models +
    " modèles · " +
    t.modelVariants +
    " variantes · " +
    t.icons +
    " icônes · " +
    (t.modelBytes / 1e6).toLocaleString("fr-FR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) +
    " Mo de modèles";
  for (const [key, label] of Object.entries(labels)) {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = label;
    $("category").append(option);
  }
  for (const a of manifest.models) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = a.name;
    const small = document.createElement("small");
    small.textContent =
      labels[a.category] +
      " · " +
      (a.usage === "horizon" ? "Horizon" : "Réserve");
    button.append(small);
    button.onclick = () => select(a.id);
    $("assetList").append(button);
    buttons.set(a.id, button);
  }
  $("category").onchange = () => {
    for (const a of manifest.models)
      buttons.get(a.id).hidden =
        $("category").value !== "all" && a.category !== $("category").value;
  };
  $("lod").onchange = () => select(selection);
  $("resetView").onclick = frame;
  for (const icon of manifest.icons) {
    const a = document.createElement("a");
    a.href = new URL(icon.path, siteRoot).href;
    a.target = "_blank";
    a.rel = "noopener";
    const img = document.createElement("img");
    img.src = a.href;
    img.alt = "";
    img.loading = "lazy";
    a.append(img, icon.id.replaceAll("_", " "));
    $("iconGrid").append(a);
  }
  function tab(icons) {
    $("modelsTab").setAttribute("aria-pressed", String(!icons));
    $("iconsTab").setAttribute("aria-pressed", String(icons));
    $("modelSection").hidden = icons;
    $("iconSection").hidden = !icons;
    $("category").hidden = icons;
    $("assetList").hidden = icons;
    if (!icons) render();
  }
  $("modelsTab").onclick = () => tab(false);
  $("iconsTab").onclick = () => tab(true);
  await select(manifest.models[0].id);
  window.PLV_ASSET_CATALOGUE = {
    get manifest() {
      return manifest;
    },
    get selected() {
      return selection;
    },
    get statistics() {
      return library.statistics;
    },
    select,
  };
} catch (error) {
  $("loadStatus").textContent = "Bibliothèque indisponible : " + error.message;
}
window.addEventListener("pagehide", () => {
  revision++;
  current?.release();
  library.dispose();
  controls.dispose();
  renderer.dispose();
});
