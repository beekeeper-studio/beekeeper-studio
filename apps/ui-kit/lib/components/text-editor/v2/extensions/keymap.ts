import { EditorView } from "@codemirror/view";
import { Extension, Compartment } from "@codemirror/state";
import { emacs } from "@replit/codemirror-emacs";
import { vim } from "@replit/codemirror-vim";
import { Keymap } from "../types";

const keymapCompartment = new Compartment();

export function keymap() {
  return keymapCompartment.of([]);
}

/**
 * Apply a keymap (vim, emacs, etc.) to the editor
 */
export function applyKeymap(view: EditorView, keymap: Keymap) {
  let extension: Extension = [];

  if (keymap === "vim") {
    extension = vim();
  } else if (keymap === "emacs") {
    extension = emacs();
  }

  view.dispatch({
    effects: keymapCompartment.reconfigure(extension),
  });
}
