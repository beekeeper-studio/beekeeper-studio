import { PropType } from "vue";
import { Keybindings, Keymap } from "../text-editor";
import { CustomMenuItems } from "../context-menu";
import { Clipboard, Config } from "../text-editor/extensions/vim";
import { Extension } from "@codemirror/state";

export default {
  isFocused: Boolean,
  keymap: {
    type: String as PropType<Keymap>,
    validater(value: Keymap) {
      return ["default", "vim", "emacs"].includes(value);
    },
    default: "default"
  },
  lineWrapping: Boolean,
  keybindings: {
    type: Object as PropType<Keybindings>,
    default: () => ({})
  },
  contextMenuItems: [Array, Function] as PropType<CustomMenuItems>,
  vimConfig: Object as PropType<Config>,
  vimKeymaps: Array,
  clipboard: Object as PropType<Clipboard>,
  promptSymbol: {
    type: String,
    default: "mongo> "
  },
  maxPromptSymbolLength: {
    type: Number,
    default: 30
  },
  output: Object,
  extensions: [Array, Function] as PropType<Extension>,

}
