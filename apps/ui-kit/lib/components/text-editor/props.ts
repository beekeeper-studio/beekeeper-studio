import type { CustomMenuItems } from "../context-menu";
import { PropType } from "vue";
import { Keybindings, Keymap, LanguageServerConfiguration, EditorMarker, LineGutter } from "./types";
import { Extension } from "@codemirror/state";
import { Clipboard, Config, VimDirective } from "./extensions/vim";

export default {
  value: {
    type: String,
    default: "",
  },
  readOnly: {
    type: Boolean,
    default: false,
  },
  height: {
    type: Number,
    deprecated: true,
    validator() {
      console.warn(
        "[TextEditor] The 'height' prop is deprecated. Please use CSS to control the height instead."
      );
      return true;
    },
  },
  isFocused: Boolean,
  forceInitialize: null,
  /**
   * Configure the keymap to use. The default is 'default'. Other possible
   * values are 'vim', 'emacs'.
   */
  keymap: {
    type: String as PropType<Keymap>,
    validator(value: Keymap) {
      // NOTE: compared to v1, this doesn't support 'sublime'
      return ["default", "vim", "emacs"].includes(value);
    },
    default: "default",
  },
  lineWrapping: Boolean,
  lineNumbers: {
    type: Boolean,
    default: true,
  },
  keybindings: {
    type: Object as PropType<Keybindings>,
    default: () => ({})
  },
  contextMenuItems: [Array, Function] as PropType<CustomMenuItems>,

  // ------- New props below

  /** The id of the language. If language server is enabled, this will be the language id sent to the language server.
   * This replaces `mode: [String, Object]` and `hint: String`. */
  languageId: {
    type: String,
    default: "plaintext",
  },
  /** Enable language server support by passing the configuration. */
  lsConfig: Object as PropType<LanguageServerConfiguration>,
  replaceExtensions: [Array, Function] as PropType<
    Extension | ((extensions: Extension) => Extension)
  >,

  vimConfig: Object as PropType<Config>,
  markers: {
    type: Array as PropType<EditorMarker[]>,
    default: () => [],
  },
  lineGutters: {
    type: Array as PropType<LineGutter[]>,
    default: () => [],
  },
  /** Enable fold gutter. */
  foldGutters: Boolean,
  // cursor: String,
  // initialized: Boolean,
  // autoFocus: Boolean,
  // removeJsonRootBrackets: Boolean,
  // bookmarks: Array,
  /** Fold all folds in the editor. */
  foldAll: null,
  /** Unfold all folds in the editor. */
  unfoldAll: null,
  /**
   * Configure vim from the host application. `vimKeymaps` accepts an array of
   * directives, applied in order. A directive with no `type` is a mapping:
   * - lhs: The key you want to map
   * - rhs: The key you want to map to
   * - mode: (optional) The mode to map in ('normal', 'visual', 'insert').
   *   Omitted means every mode.
   * - noremap: (optional) Map non-recursively, i.e. `nnoremap` rather than
   *   `nmap`. Required whenever the rhs contains the lhs, which would
   *   otherwise expand forever.
   *
   * For example, to map `;` to `:`, you can do:
   *
   * ```
   * const vimKeymaps = [
   *   { lhs: ';', rhs: ':' }
   * ]
   * ```
   *
   * In vim, that would be `:map ; :`.
   *
   * The other directives mirror their vim commands:
   * `{ type: 'unmap', lhs, mode? }`, `{ type: 'mapclear', mode? }`, and
   * `{ type: 'set', name, value }` where value is a string or a boolean.
   */
  vimKeymaps: Array as PropType<VimDirective[]>,
  clipboard: Object as PropType<Clipboard>
};
