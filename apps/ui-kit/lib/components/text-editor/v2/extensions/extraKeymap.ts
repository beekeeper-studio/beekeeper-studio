import { EditorView, keymap } from "@codemirror/view";
import { Compartment } from "@codemirror/state";
import { Keybindings } from "../types";

const extraKeymapCompartment = new Compartment();

export function extraKeymap() {
  return extraKeymapCompartment.of(keymap.of([]));
}

/**
 * Apply custom keybindings to the editor
 */
export function applyKeybindings(view: EditorView, keybindings: Keybindings) {
  const extraKeymap = Object.keys(keybindings).map((key) => ({
    key,
    run: () => {
      keybindings[key]();
      return true;
    },
  }));

  view.dispatch({
    effects: extraKeymapCompartment.reconfigure(keymap.of(extraKeymap)),
  });
}
