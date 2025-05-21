import { EditorView, keymap } from "@codemirror/view";
import { Compartment } from "@codemirror/state";
import { Keybindings } from "../types";

export interface ExtraKeymapConfiguration {
  keybindings?: Keybindings;
}

const extraKeymapCompartment = new Compartment();

export function extraKeymap(config: ExtraKeymapConfiguration = {}) {
  return extraKeymapCompartment.of(keymap.of(buildKeymap(config.keybindings)));
}

/**
 * Apply custom keybindings to the editor
 */
export function applyKeybindings(view: EditorView, keybindings: Keybindings) {
  view.dispatch({
    effects: extraKeymapCompartment.reconfigure(
      keymap.of(buildKeymap(keybindings))
    ),
  });
}

function buildKeymap(keybindings: Keybindings) {
  return Object.keys(keybindings).map((key) => ({
    key,
    run: () => {
      keybindings[key]();
      return true;
    },
  }));
}
