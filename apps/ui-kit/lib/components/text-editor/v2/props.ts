import { PropType } from "vue";
import { LSClientConfiguration } from "./types";

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
      validator(val) {
        console.warn("[TextEditor] The 'height' prop is deprecated. Please use CSS to control the height instead.");
        return true;
      }
    },

    // ------- New props below

    /** The id of the language. If language server is enabled, this will be the language id sent to the language server.
     * This replaces `mode: [String, Object]` and `hint: String`. */
    languageId: {
      type: String as PropType<"plaintext" | "sql">,
      default: "plaintext",
    },

    /** Enable language server support by passing the configuration. */
    lsClientConfig: Object as PropType<Omit<LSClientConfiguration, 'languageId'>>,

    // keybindings: Object as PropType<Record<string, () => void>>,
    // vimConfig: Object as PropType<Config>,
    // lineWrapping: Boolean,
    // columnsGetter: Function,
    // focus: Boolean,
    // contextMenuItems: [Array, Function] as PropType<CustomMenuItems>,
    // markers: {
    //   type: Array,
    //   default: () => [],
    // },
    // cursor: String,
    // initialized: Boolean,
    // autoFocus: Boolean,
    // lineNumbers: {
    //   type: Boolean,
    //   default: true,
    // },
    // foldGutter: Boolean,
    // removeJsonRootBrackets: Boolean,
    // forceInitialize: null,
    // bookmarks: Array,
    // foldAll: null,
    // unfoldAll: null,
    // /**
    //  * Configure the keymap to use. The default is 'default'. Other possible
    //  * values are 'vim', 'emacs' and 'sublime'.
    //  */
    // keymap: {
    //   validator(value: string) {
    //     return ["default", "vim", "emacs", "sublime"].includes(value);
    //   },
    //   default: "default",
    // },
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
}
