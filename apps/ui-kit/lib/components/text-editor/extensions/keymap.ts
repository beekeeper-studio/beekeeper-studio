import { EditorView, ViewPlugin } from "@codemirror/view";
import { Extension, Compartment } from "@codemirror/state";
import { emacs } from "@replit/codemirror-emacs";
import { vim, getCM } from "@replit/codemirror-vim";
import * as VimLib from "@replit/codemirror-vim";
import { Keymap } from "../types";
import { Clipboard, Config, extendVimOnCodeMirror, VimDirective } from "./vim";

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

// The vim plugin only announces the mode as text inside its panel; mirroring
// it onto the editor lets the panel be styled per mode.
const vimModeAttribute = ViewPlugin.fromClass(
  class {
    private cm: any = null;

    constructor(private view: EditorView) {
      this.attach();
    }

    update() {
      this.attach();
    }

    destroy() {
      this.cm?.off("vim-mode-change", this.onModeChange);
      this.view.dom.removeAttribute("data-vim-mode");
    }

    private attach() {
      if (this.cm) {
        return;
      }
      this.cm = getCM(this.view);
      if (!this.cm) {
        return;
      }
      this.cm.on("vim-mode-change", this.onModeChange);
      this.view.dom.dataset.vimMode = this.cm.state.vim?.mode || "normal";
    }

    private onModeChange = (event: { mode: string }) => {
      this.view.dom.dataset.vimMode = event.mode;
    };
  }
);

function buildKeymap(keymap: Keymap, options: VimOptions = {}): Extension {
  let extension: Extension = [];

  if (keymap === "vim") {
    // status renders codemirror's own bottom panel: the current mode, any
    // pending keys, and the : and / input lines.
    extension = [vim({ status: true }), vimModeAttribute];
    extendVimOnCodeMirror(Vim, options.config, options.keymaps, options.clipboard);
  } else if (keymap === "emacs") {
    extension = emacs();
  }

  return extension;
}
