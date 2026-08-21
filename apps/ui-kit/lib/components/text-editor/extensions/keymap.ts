import { EditorView } from "@codemirror/view";
import { Extension, Compartment } from "@codemirror/state";
import { emacs } from "@replit/codemirror-emacs";
import { vim } from "@replit/codemirror-vim";
import * as VimLib from "@replit/codemirror-vim";
import { Keymap } from "../types";
import { Clipboard, Config, extendVimOnCodeMirror, VimDirective } from "./vim";
import { minimalEmacs } from "./minimalEmacs";

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
  keymaps?: VimDirective[];
  clipboard?: Clipboard;
}

function buildKeymap(keymap: Keymap, options: VimOptions = {}): Extension {
  let extension: Extension = [];

  if (keymap === "vim") {
    // status renders codemirror's own bottom panel: the current mode, any
    // pending keys, and the : and / input lines.
    extension = vim({ status: true });
    extendVimOnCodeMirror(Vim, options.config, options.keymaps, options.clipboard);
  } else if (keymap === "emacs") {
    extension = emacs();
  } else if (keymap === "minimal-emacs") {
    extension = minimalEmacs();
  }

  return extension;
}
