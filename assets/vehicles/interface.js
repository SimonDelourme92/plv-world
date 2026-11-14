export function createVehicleInterface(audio) {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = new URL("./vehicle.css", import.meta.url).href;
  document.head.append(link);
  const key = "plv-world-vehicle-audio-v1";
  try {
    const s = JSON.parse(localStorage.getItem(key));
    if (s) {
      if (typeof s.enabled === "boolean") audio.enabled = s.enabled;
      if (Number.isFinite(s.volume))
        audio.volume = Math.max(0, Math.min(1, s.volume));
    }
  } catch {}
  const hud = document.createElement("section");
  hud.id = "vehicleHUD";
  hud.hidden = true;
  hud.setAttribute("aria-label", "Compteur de la berline");
  hud.innerHTML =
    '<div class="vehicle-dial"><span class="vehicle-caption">VITESSE</span><div><b id="vehicleSpeed">0</b><span class="vehicle-unit">km/h</span></div><div class="vehicle-rpm"><i></i></div><div class="vehicle-meta"><span id="vehicleGear">D1</span><span id="vehicleRpm">850 tr/min</span></div></div><div class="vehicle-controls"><span>B · Klaxon</span><span>L · Phares</span><button id="vehicleMute" type="button" aria-label="Couper le son du véhicule">Son actif</button></div>';
  document.body.append(hud);
  const settings = document.createElement("div");
  settings.className = "vehicle-settings";
  settings.innerHTML =
    '<h3>Audio du véhicule</h3><div class="setting"><label for="vehicleSound">Moteur et sons de conduite <input id="vehicleSound" type="checkbox"></label></div><div class="setting"><label for="engineVolume">Volume du véhicule <b id="engineVolumeVal"></b></label><input id="engineVolume" type="range" min="0" max="100" step="5"></div><p class="muted vehicle-audio-note">Indépendant de l’ambiance sonore. Le son démarre après votre première interaction.</p><a class="vehicle-credit" href="assets/vehicles/credits.html" target="_blank" rel="noopener">Berline : Comrade1280 · CC BY 4.0 — Sons : GGBotNet · CC0</a>';
  settings.classList.add("vehicle-audio-settings");
  // The vehicle module initializes before the refined menu; attach it here,
  // then the menu moves this node into its visible settings page.
  document.querySelector("#pause .columns").children[1].append(settings);
  const sound = settings.querySelector("#vehicleSound"),
    volume = settings.querySelector("#engineVolume"),
    label = settings.querySelector("#engineVolumeVal"),
    mute = hud.querySelector("#vehicleMute"),
    speed = hud.querySelector("#vehicleSpeed"),
    gear = hud.querySelector("#vehicleGear"),
    rpm = hud.querySelector("#vehicleRpm"),
    bar = hud.querySelector(".vehicle-rpm i");
  const sync = () => {
    sound.checked = audio.enabled;
    volume.value = Math.round(audio.volume * 100);
    label.textContent = volume.value + " %";
    mute.textContent = audio.enabled ? "N · Son actif" : "N · Son coupé";
    mute.setAttribute(
      "aria-label",
      audio.enabled
        ? "Couper le son du véhicule"
        : "Activer le son du véhicule",
    );
    mute.setAttribute("aria-pressed", String(!audio.enabled));
  };
  const save = () => {
    try {
      localStorage.setItem(
        key,
        JSON.stringify({ enabled: audio.enabled, volume: audio.volume }),
      );
    } catch {}
    sync();
  };
  sound.onchange = () => {
    audio.enabled = sound.checked;
    if (audio.enabled) audio.unlock();
    save();
  };
  volume.oninput = () => {
    audio.volume = +volume.value / 100;
    label.textContent = volume.value + " %";
  };
  volume.onchange = save;
  const toggleMute = () => {
    audio.enabled = !audio.enabled;
    if (audio.enabled) audio.unlock();
    save();
  };
  mute.onclick = toggleMute;
  sync();
  const help = document.querySelector("#pause .help");
  for (const [key, label] of [
    ["B", "Klaxon · maintenir en conduite"],
    ["L", "Allumer / éteindre les phares"],
    ["N", "Couper / réactiver le son du véhicule"],
    ["Espace + Z/W", "Patinage à l’arrêt · frein à main en mouvement"],
  ]) {
    const k = document.createElement("span");
    k.className = "key";
    k.textContent = key;
    const text = document.createElement("span");
    text.textContent = label;
    help.append(k, text);
  }
  let last = -Infinity;
  return {
    update(state, visible, now) {
      hud.hidden = !visible;
      document.body.classList.toggle("driving", visible);
      if (!visible || now - last < 100) return;
      last = now;
      speed.textContent = String(Math.round(Math.abs(state.speed) * 3.6));
      gear.textContent =
        state.speed < -0.15
          ? "R"
          : Math.abs(state.speed) < 0.15 && !state.throttle
            ? "P"
            : "D" + Math.max(1, state.gear);
      rpm.textContent = Math.round(state.rpm / 50) * 50 + " tr/min";
      bar.style.transform = "scaleX(" + Math.min(1, state.rpm / 6500) + ")";
    },
    sync,
    toggleMute,
    dispose() {
      hud.remove();
      settings.remove();
      link.remove();
      document.body.classList.remove("driving");
    },
  };
}
