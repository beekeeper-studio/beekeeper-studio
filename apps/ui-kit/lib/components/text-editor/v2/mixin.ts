import { TextEditor } from "./TextEditor";
import props from "./props";
import {
  divider,
  InternalContextItem,
  openMenu,
  useCustomMenuItems,
} from "../../context-menu";
import { readClipboard, writeClipboard } from "../../../utils";

export default {
  props,

  data() {
    return {
      textEditor: null,
      internalContextMenuItems: [],
    };
  },

  watch: {
    value() {
      if (!this.textEditor) return;
      this.applyValue();
    },
    readOnly() {
      if (!this.textEditor) return;
      this.applyReadOnly();
    },
    focus() {
      if (!this.textEditor) return;
      this.applyFocus();
    },
    keymap() {
      if (!this.textEditor) return;
      this.applyKeymap();
    },
    lineWrapping() {
      if (!this.textEditor) return;
      this.applyLineWrapping();
    },
    lineNumbers() {
      if (!this.textEditor) return;
      this.applyLineWrapping();
    },
    keybindings() {
      if (!this.textEditor) return;
      this.applyKeybindings();
    },
    lsClientConfig() {
      if (!this.textEditor) return;
      this.applyLSClientConfig();
    },

    forceInitialize() {
      this.initialize();
    },
  },

  methods: {
    applyValue() {
      if (this.value !== this.textEditor.getValue()) {
        this.textEditor.setValue(this.value);
      }
    },
    applyReadOnly() {
      this.textEditor.setReadOnly(this.readOnly);
    },
    applyFocus() {
      if (this.focus) {
        this.textEditor.focus();
      }
    },
    applyKeymap() {
      this.textEditor.setKeymap(this.keymap);
    },
    applyLineWrapping() {
      this.textEditor.setLineWrapping(this.lineWrapping);
    },
    applyLineNumbers() {
      this.textEditor.setLineNumbers(this.lineNumbers);
    },
    applyKeybindings() {
      this.textEditor.setKeybindings(this.keybindings);
    },
    applyLSClientConfig() {
      if (this.lsClientConfig) {
        this.textEditor.initializeLSClientConfig({
          ...this.lsClientConfig,
          languageId: this.languageId,
        });
      } else {
        // TODO: Destroy the language server client
      }
    },

    constructTextEditor() {
      return new TextEditor();
    },
    initialize() {
      if (this.textEditor) {
        this.textEditor.destroy();
        this.textEditor = null;
      }

      const textEditor: TextEditor = this.constructTextEditor();

      textEditor.initialize({
        parent: this.$refs.editor,
        onValueChange: (value) => {
          this.$emit("bks-value-change", { value });
        },
        replaceExtensions: this.replaceExtensions,
      });

      this.textEditor = textEditor;

      this.applyValue();
      this.applyReadOnly();
      this.applyFocus();
      this.applyLSClientConfig();
      this.applyKeymap();
      this.applyLineWrapping();
      this.applyLineNumbers();
      this.applyKeybindings();

      this.initialized?.();
    },

    showContextMenu(event: Event) {
      event.preventDefault();

      const hasSelectedText = this.textEditor.getSelection();
      const selectionDepClass = hasSelectedText ? "" : "disabled";
      const menu = {
        options: [
          {
            label: "Undo",
            id: "text-undo",
            handler: () => this.textEditor.execCommand("undo"),
            shortcut: "Control+Z",
            write: true,
          },
          {
            label: "Redo",
            id: "text-redo",
            handler: () => this.textEditor.execCommand("redo"),
            shortcut: "Shift+Z",
            write: true,
          },
          {
            label: "Cut",
            id: "text-cut",
            handler: () => {
              const selection = this.textEditor.getSelection();
              this.textEditor.replaceSelection("");
              writeClipboard(selection);
            },
            class: selectionDepClass,
            shortcut: "Control+X",
            write: true,
          },
          {
            label: "Copy",
            id: "text-copy",
            handler: async () => {
              const selection = this.textEditor.getSelection();
              await writeClipboard(selection);
            },
            class: selectionDepClass,
            shortcut: "Control+C",
          },
          {
            label: "Paste",
            id: "text-paste",
            handler: async () => {
              const clipboard = await readClipboard();
              if (this.textEditor.getSelection()) {
                this.textEditor.replaceSelection(clipboard, "around");
              } else {
                const cursor = this.textEditor.getCursor();
                this.textEditor.replaceRange(clipboard, cursor);
              }
            },
            shortcut: "Control+V",
            write: true,
          },
          {
            label: "Delete",
            id: "text-delete",
            handler: () => {
              this.textEditor.replaceSelection("");
            },
            class: selectionDepClass,
            write: true,
          },
          {
            label: "Select All",
            id: "text-select-all",
            handler: () => {
              this.textEditor.execCommand("selectAll");
            },
            shortcut: "Control+A",
          },
          divider,
          {
            label: "Find",
            id: "text-find",
            handler: () => {
              this.textEditor.execCommand("find");
            },
            shortcut: "Control+F",
          },
          {
            label: "Replace",
            id: "text-replace",
            handler: () => {
              this.textEditor.execCommand("replace");
            },
            shortcut: "Control+R",
            write: true,
          },
          {
            label: "Replace All",
            id: "text-replace-all",
            handler: () => {
              this.textEditor.execCommand("replaceAll");
            },
            shortcut: "Shift+R",
            write: true,
          },
        ],
        event,
      };

      if (this.readOnly) {
        menu.options = menu.options.filter((option) => !option.write);
      }

      let items = useCustomMenuItems(
        event,
        undefined,
        menu.options,
        this.internalContextMenuItems
      );
      items = useCustomMenuItems(
        event,
        undefined,
        items as InternalContextItem<unknown>[],
        this.contextMenuItems
      );
      openMenu({ event, options: items });
    },
  },

  mounted() {
    this.initialize();
    this.$refs.editor.addEventListener("contextmenu", this.showContextMenu);
  },

  beforeDestroy() {
    if (this.textEditor) {
      this.textEditor.destroy();
      this.textEditor = null;
    }
    this.$refs.editor.removeEventListener("contextmenu", this.showContextMenu);
  },
};
