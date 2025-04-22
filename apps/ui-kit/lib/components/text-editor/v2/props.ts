import type { CustomMenuItems } from "../../context-menu";
import { PropType } from "vue";
import { Keybindings, Keymap, LanguageServerConfiguration } from "./types";
import { Extension } from "@codemirror/state";

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
  focus: Boolean,
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
    type: String as PropType<"plaintext" | "sql">,
    default: "plaintext",
  },
  /** Enable language server support by passing the configuration. */
  lsConfig: Object as PropType<LanguageServerConfiguration>,
  replaceExtensions: [Array, Function] as PropType<
    Extension | ((extensions: Extension) => Extension)
  >,

  // vimConfig: Object as PropType<Config>,
  // markers: {
  //   type: Array,
  //   default: () => [],
  // },
  // cursor: String,
  // initialized: Boolean,
  // autoFocus: Boolean,
  // foldGutter: Boolean,
  // removeJsonRootBrackets: Boolean,
  // bookmarks: Array,
  // foldAll: null,
  // unfoldAll: null,
  // /**
  //  * Configure custom key mappings in vim. `vimKeymaps` accepts an array of
  //  * objects that contain the following properties:
  //  * - lhs: The key you want to map
  //  * - rhs: The key you want to map to
  //  * - mode: (optional) The mode in which you want to map the key ('normal', 'visual', 'insert')
  //  *
  //  * For example, to map `;` to `:`, you can do:
  //  *
  //  * ```
  //  * const vimKeymaps = [
  //  *   { lhs: ';', rhs: ':' }
  //  * ]
  //  * ```
  //  *
  //  * In vim, that would be `:map ; :`.
  //  */
  // vimKeymaps: Array,
  // clipboard: Object as PropType<Clipboard>
};
