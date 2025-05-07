import { EditorView } from "@codemirror/view";
import { Extension, Compartment } from "@codemirror/state";
import { emacs } from "@replit/codemirror-emacs";
import { vim } from "@replit/codemirror-vim";
import { Keymap } from "../types";

export interface SpecialKeymapConfiguration {
  keymap?: Keymap;
}

const keymapCompartment = new Compartment();

export function keymap(
  config: SpecialKeymapConfiguration = { keymap: "default" }
) {
  return keymapCompartment.of(buildKeymap(config.keymap));
}

/**
 * Apply a keymap (vim, emacs, etc.) to the editor
 */
export function applyKeymap(view: EditorView, keymap: Keymap) {
  view.dispatch({
    effects: keymapCompartment.reconfigure(buildKeymap(keymap)),
  });
}

function buildKeymap(keymap: Keymap) {
  let extension: Extension = [];

  if (keymap === "vim") {
    extension = vim();
  } else if (keymap === "emacs") {
    extension = emacs();
  }

  return extension;
}
