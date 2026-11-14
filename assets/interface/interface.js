import { decorateInputPrompts } from "../library/input-prompts.js";
// Interface originale : conserve les éléments et identifiants de l'application.
export function createInterface() {
  const elements = new Map(
    [...document.querySelectorAll("[id]")].map((e) => [e.id, e]),
  );
  const $ = (id) => elements.get(id) || document.getElementById(id),
    panel = $("pause").querySelector(".panel");
  const topActions = panel.querySelector(":scope > .actions"),
    inventoryActions = panel.querySelectorAll(":scope > .actions")[1];
  const columns = panel.querySelector(":scope > .columns"),
    help = columns.children[0],
    settings = columns.children[1];
  const tests = [...panel.querySelectorAll(":scope > .testbox")],
    data = panel.querySelector(":scope > .data"),
    reminder = $("backupReminder"),
    status = $("status");
  const brand = document.createElement("div");
  brand.className = "menu-brand";
  brand.innerHTML =
    '<span class="brand-mark" aria-hidden="true">P / W</span><span>PLV WORLD<small>Votre année, à l’échelle réelle</small></span>';
  const rail = document.createElement("nav");
  rail.className = "menu-rail";
  rail.setAttribute("aria-label", "Menu principal");
  rail.append(brand);
  const pages = document.createElement("div");
  pages.className = "menu-pages";
  const sections = new Map(),
    buttons = new Map();
  const definitions = [
    ["explore", "Explorer", "Votre cité, à votre rythme."],
    ["inventory", "Inventaire", "Vos productions, au même endroit."],
    ["settings", "Réglages", "Une expérience à votre mesure."],
    ["help", "Commandes", "Prenez vos repères."],
  ];
  function select(key, focus = false) {
    for (const [id, section] of sections) {
      section.hidden = id !== key;
      buttons
        .get(id)
        .setAttribute("aria-current", id === key ? "page" : "false");
    }
    if (focus) buttons.get(key).focus();
  }
  for (const [key, label, title] of definitions) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.id = "menu-" + key;
    button.setAttribute("aria-controls", "page-" + key);
    button.onclick = () => select(key);
    rail.append(button);
    buttons.set(key, button);
    const section = document.createElement("section");
    section.id = "page-" + key;
    section.className = "menu-page";
    section.setAttribute("aria-labelledby", button.id);
    const eyebrow = document.createElement("div");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = label;
    const h = document.createElement("h2");
    h.textContent = title;
    section.append(eyebrow, h);
    sections.set(key, section);
    pages.append(section);
  }
  const explore = sections.get("explore");
  const intro = document.createElement("p");
  intro.className = "menu-intro";
  intro.textContent =
    "Parcourez la cité. Retrouvez vos productions. Changez de point de vue.";
  explore.append(intro, topActions);
  $("pausePhotoBtn").hidden = true;
  $("play").textContent = "Explorer / reprendre";
  $("thirdBtn").textContent = "Vue personnage";
  $("carBtn").textContent = "Prendre le véhicule";
  $("flyBtn").textContent = "Vue drone";
  $("openMap").textContent = "Ouvrir la carte";
  $("photoModeMenu").textContent = "Composer une photo";
  $("pausePhotoBtn").textContent = "Capture instantanée";
  $("pilotBtn").textContent = "Découvrir le Parvis Méridien";
  const inventory = sections.get("inventory");
  const note = document.createElement("p");
  note.className = "menu-intro";
  note.textContent =
    "Vos lots et vos fichiers restent dans ce navigateur. Téléchargez une sauvegarde pour en conserver une copie.";
  inventory.append(note, inventoryActions, data, $("saveHud"), reminder);
  const settingsPage = sections.get("settings");
  settings.className = "settings-grid";
  settings.querySelector("h3").remove();
  const sensitivity = document.createElement("div");
  sensitivity.className = "setting";
  sensitivity.innerHTML =
    '<label for="mouseSensitivity">Sensibilité souris <b id="mouseSensitivityVal">0,85</b></label><input id="mouseSensitivity" type="range" min="0.4" max="2" step="0.05" value="0.85">';
  const horizon = document.createElement("div");
  horizon.className = "setting";
  horizon.innerHTML =
    '<label for="horizonEnabled">Horizon et trafic aérien <input id="horizonEnabled" type="checkbox" checked></label>';
  settings.prepend(sensitivity, horizon);
  settingsPage.append(settings);
  const advanced = document.createElement("details");
  advanced.className = "advanced-tools";
  const summary = document.createElement("summary");
  summary.textContent = "Tests et diagnostics";
  advanced.append(summary, ...tests);
  settingsPage.append(advanced);
  const helpPage = sections.get("help");
  help.querySelector("h3").remove();
  helpPage.append(help);
  const extra = document.createElement("p");
  extra.className = "menu-intro";
  extra.textContent =
    "Échap libère la souris et ouvre le menu. H affiche cette aide. Les raccourcis restent inactifs pendant la saisie dans les formulaires.";
  helpPage.append(extra);
  const footer = document.createElement("div");
  footer.className = "menu-footer";
  footer.textContent = "Exploration · exposition · grandeur nature";
  rail.append(footer);
  panel.replaceChildren(rail, pages, status);
  $("pause").setAttribute("role", "dialog");
  $("pause").setAttribute("aria-modal", "true");
  status.setAttribute("role", "status");
  select("explore");
  // Le HUD ne garde que le lieu, le mode et la quantité. Les détails sont sur F.
  for (const id of ["mode", "quarter", "total"])
    $(id).parentElement.classList.add("hud-essential");
  $("hud").querySelector(".eyebrow").textContent = "CITÉ DES PRODUCTIONS";
  $("hud").querySelector("h1").textContent = "PLV / WORLD";
  $("photoModeBtn").innerHTML = "Photo <kbd>O</kbd>";
  $("mapBtn").innerHTML = "Carte <kbd>M</kbd>";
  $("searchBtn").innerHTML = "Rechercher <kbd>R</kbd>";
  $("pauseBtn").innerHTML = "Menu <kbd>Échap</kbd>";
  // La capture rapide reste disponible dans Explorer et sur P.
  sections.get("explore").querySelector(".actions").append($("photoBtn"));
  $("photoBtn").textContent = "Capture PNG · P";
  const more = document.createElement("details");
  more.className = "explore-tools";
  const moreTitle = document.createElement("summary");
  moreTitle.textContent = "Visite, photo et captures";
  const moreActions = document.createElement("div");
  moreActions.className = "actions";
  moreActions.append(
    $("tourStart"),
    $("homeBtn"),
    $("photoModeMenu"),
    $("photoBtn"),
  );
  more.append(moreTitle, moreActions);
  explore.append(more);
  const resume = document.createElement("button");
  resume.type = "button";
  resume.id = "resumeFromMenu";
  resume.className = "resume-menu";
  resume.textContent = "Reprendre l’exploration";
  resume.hidden = true;
  resume.onclick = () => $("play").click();
  rail.insertBefore(resume, footer);
  $("lotFocus").querySelector(".focusHint").textContent =
    "E / clic · examiner la production";
  $("miniMap").querySelector(".minihead b").textContent = "À PROXIMITÉ";
  $("mapBanner").querySelector("b").textContent = "VOTRE CITÉ";
  $("mapBanner").querySelector("span").textContent =
    "Glisser pour déplacer · molette pour zoomer";
  // Rendre les touches lisibles plutôt qu'afficher une longue ligne permanente.
  const entries = [
    ["ZQSD / WASD", "Marcher · souris pour regarder"],
    ["Maj", "Courir · accélérer en drone"],
    ["Espace", "Sauter · monter en drone · freiner en voiture"],
    ["E / clic", "Examiner la production visée"],
    ["C", "Prendre / quitter le véhicule"],
    ["T", "Vue à pied / personnage"],
    ["V", "À pied / drone"],
    ["M", "Ouvrir / fermer la carte"],
    ["O", "Entrer / quitter le mode photo"],
    ["P", "Capture PNG sans interface"],
    ["R", "Rechercher une production"],
    ["H", "Afficher cette aide"],
    ["F", "Afficher / masquer les mesures"],
    ["Échap", "Pause · libérer la souris"],
    ["Molette", "Zoom externe · vitesse drone · zoom carte"],
    ["Ctrl", "Descendre en drone"],
  ];
  const grid = help.querySelector(".help");
  grid.replaceChildren();
  for (const [key, label] of entries) {
    const k = document.createElement("kbd");
    k.className = "key";
    k.textContent = key;
    const span = document.createElement("span");
    span.textContent = label;
    grid.append(k, span);
  }
  document.addEventListener("keydown", (event) => {
    if (
      event.key !== "Tab" ||
      $("pause").hidden ||
      !$("manager").hidden ||
      document.body.classList.contains("photo-mode")
    )
      return;
    const list = [
      ...panel.querySelectorAll("button,input,select,summary,a[href]"),
    ].filter((e) => !e.disabled && e.getClientRects().length);
    if (!list.length) return;
    const first = list[0],
      last = list[list.length - 1];
    if (
      event.shiftKey &&
      (document.activeElement === first ||
        !panel.contains(document.activeElement))
    ) {
      event.preventDefault();
      last.focus();
    } else if (
      !event.shiftKey &&
      (document.activeElement === last ||
        !panel.contains(document.activeElement))
    ) {
      event.preventDefault();
      first.focus();
    }
  });
  const assetLinks = document.createElement("p");
  assetLinks.className = "asset-links";
  for (const [file, label] of [
    ["catalogue.html", "Bibliothèque 3D"],
    ["credits.html", "Crédits des modèles 3D"],
  ]) {
    const a = document.createElement("a");
    a.href = new URL("../library/" + file, import.meta.url).href;
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = label;
    assetLinks.append(a);
  }
  settingsPage.append(assetLinks);
  decorateInputPrompts();
  document.body.classList.add("refined-ui");
  let hintTimer = null,
    entered = false;
  return {
    select,
    refresh(mode, map, paused, tour, photo, diagnostics) {
      $("play").textContent = entered
        ? "Reprendre l’exploration"
        : "Explorer la cité";
      resume.hidden = !entered;
      document.body.classList.toggle("is-paused", paused);
      document.body.classList.toggle("is-map", map);
      document.body.classList.toggle("is-driving", mode === "car");
      document.body.classList.toggle("is-fly", mode === "fly");
      $("carBtn").textContent =
        mode === "car" ? "Descendre du véhicule" : "Prendre le véhicule";
      $("thirdBtn").textContent =
        mode === "third" ? "Revenir en vue à pied" : "Vue personnage";
      $("flyBtn").textContent = mode === "fly" ? "Revenir à pied" : "Vue drone";
      document.body.classList.toggle("show-diagnostics", diagnostics);
      $("hud").setAttribute("aria-label", "Position et inventaire");
    },
    hint() {
      entered = true;
      resume.hidden = false;
      $("play").textContent = "Reprendre l’exploration";
      document.body.classList.add("show-command-hint");
      clearTimeout(hintTimer);
      hintTimer = setTimeout(
        () => document.body.classList.remove("show-command-hint"),
        6500,
      );
    },
  };
}
