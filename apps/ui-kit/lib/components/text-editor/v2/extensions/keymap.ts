import { EditorView } from "@codemirror/view";
import { Extension, Compartment } from "@codemirror/state";
import { emacs } from "@replit/codemirror-emacs";
import { vim } from "@replit/codemirror-vim";
import * as VimLib from "@replit/codemirror-vim";
import { Keymap } from "../types";
import { Clipboard, Config, extendVimOnCodeMirror, IMapping } from "./vim";

const Vim = VimLib.Vim;

export interface SpecialKeymapConfiguration {
  keymap?: Keymap;
  vimOptions?: VimOptions;
}

const keymapCompartment = new Compartment();

export function keymap(
  config: SpecialKeymapConfiguration = { keymap: "default" }
) {
  return keymapCompartment.of(buildKeymap(config.keymap, config.vimOptions));
}

/**
 * Apply a keymap (vim, emacs, etc.) to the editor
 */
export function applyKeymap(view: EditorView, keymap: Keymap, options: VimOptions = {}) {
  view.dispatch({
    effects: keymapCompartment.reconfigure(buildKeymap(keymap, options)),
  });
}

export interface VimOptions {
  config?: Config;
  keymaps?: IMapping[];
  clipboard?: Clipboard;
}

function buildKeymap(keymap: Keymap, options: VimOptions = {}): Extension {
  let extension: Extension = [];

  if (keymap === "vim") {
    extension = vim();
    extendVimOnCodeMirror(Vim, options.config, options.keymaps, options.clipboard);
  } else if (keymap === "emacs") {
    extension = emacs();
  }

  return extension;
}
