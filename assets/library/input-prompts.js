// Icônes officielles Kenney, sans remplacement des commandes ni de leurs événements.
const root = new URL("./icons/", import.meta.url);
const icons = {
  E: ["keyboard_e"],
  C: ["keyboard_c"],
  T: ["keyboard_t"],
  V: ["keyboard_v"],
  M: ["keyboard_m"],
  O: ["keyboard_o"],
  P: ["keyboard_p"],
  R: ["keyboard_r"],
  H: ["keyboard_h"],
  F: ["keyboard_f"],
  Échap: ["keyboard_escape"],
  Maj: ["keyboard_shift"],
  Espace: ["keyboard_space"],
  Ctrl: ["keyboard_ctrl"],
  Molette: ["mouse_scroll"],
  Souris: ["mouse_move"],
  "E / clic": ["keyboard_e", "mouse_left"],
};
export function decorateInputPrompts(container = document) {
  for (const key of container.querySelectorAll(".help .key,#toolbar kbd")) {
    const text = key.textContent.trim();
    const names =
      text === "ZQSD / WASD"
        ? ["keyboard_z", "keyboard_q", "keyboard_s", "keyboard_d"]
        : icons[text];
    if (!names) continue;
    key.classList.add("has-prompt");
    if (text === "ZQSD / WASD") key.classList.add("movement-prompts");
    key.setAttribute("aria-label", text);
    key.replaceChildren();
    for (const name of names) {
      const img = document.createElement("img");
      img.src = new URL(name + ".svg", root).href;
      img.width = 28;
      img.height = 28;
      img.alt = "";
      img.loading = "lazy";
      img.decoding = "async";
      img.className = "prompt-icon";
      key.append(img);
    }
    const label = document.createElement("span");
    label.className = text === "ZQSD / WASD" ? "movement-caption" : "sr-only";
    label.textContent = text;
    key.append(label);
  }
}
