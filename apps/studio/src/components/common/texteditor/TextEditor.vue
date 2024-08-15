<template>
  <textarea
    name="editor"
    class="editor"
    ref="editor"
    id=""
    cols="30"
    rows="10"
  />
</template>

<script lang="ts">
import "codemirror/addon/comment/comment";
import "codemirror/addon/dialog/dialog";
import "codemirror/addon/search/search";
import "codemirror/addon/search/jump-to-line";
import "codemirror/addon/scroll/annotatescrollbar";
import "codemirror/addon/search/matchesonscrollbar";
import "codemirror/addon/search/matchesonscrollbar.css";
import "codemirror/addon/search/searchcursor";
import "codemirror/mode/sql/sql";
import "codemirror/mode/javascript/javascript"; // for json
import "codemirror/mode/htmlmixed/htmlmixed";
import "codemirror/mode/css/css";
import "codemirror/mode/xml/xml";
import "codemirror/mode/diff/diff";
import "@/vendor/sql-hint";
import "@/vendor/show-hint";
import "@/lib/editor/CodeMirrorDefinitions";
import "codemirror/addon/merge/merge";
import CodeMirror from "codemirror";

import { EditorMarker } from "@/lib/editor/utils";
import { setKeybindingsFromVimrc, applyConfig, Register } from "@/lib/editor/vim";

export default {
  props: [
    "value",
    "mode",
    "hint",
    "keybindings",
    "vimConfig",
    "lineWrapping",
    "hintOptions",
    "columnsGetter",
    "height",
    "readOnly",
    "focus",
    "contextMenuOptions",
    "extraKeybindings",
    "markers",
    "selection",
    "cursor",
    "initialized",
    "forcedValue",
    "plugins",
  ],
  data() {
    return {
      editor: null
    };
  },
  computed: {
    keymapTypes() {
      return this.$config.defaults.keymapTypes;
    },
    userKeymap() {
      const settings = this.$store.state.settings?.settings;
      const value = settings?.keymap.value;
      return value && this.keymapTypes.map((k) => k.value).includes(value)
        ? value
        : "default";
    },
    hasSelectedText() {
      return this.editorInitialized ? !!this.editor.getSelection() : false;
    },
  },
  watch: {
    forcedValue() {
      this.editor.setValue(this.forcedValue);
    },
    userKeymap() {
      this.initialize();
    },
    vimConfig() {
      this.initialize();
    },
    mode() {
      this.editor.setOption("mode", this.mode);
    },
    hint() {
      this.editor.setOption("hint", this.hint);
    },
    hintOptions() {
      this.editor.setOption("hintOptions", this.hintOptions);
    },
    height() {
      this.editor.setSize(null, this.height);
      this.editor.refresh();
    },
    readOnly() {
      this.editor.setOption("readOnly", this.readOnly);
    },
    lineWrapping() {
      this.editor.setOption("lineWrapping", this.lineWrapping);
    },
    async focus() {
      if (this.focus && this.editor) {
        this.editor.focus();
        await this.$nextTick();
        // this fixes the editor not showing because it doesn't think it's dom element is in view.
        // its a hit and miss error
        this.editor.refresh();
      }
    },
    markers() {
      this.editor.getAllMarks().forEach((mark: CodeMirror.TextMarker) => {
        mark.clear();
      });
      this.markers.forEach((marker: EditorMarker) => {
        if (marker.type === "error") {
          this.editor.markText(marker.from, marker.to, { className: "error" });
        } else if (marker.type === "highlight") {
          this.editor.markText(marker.from, marker.to, {
            className: "highlight",
          });
        }
      });
    },
  },
  methods: {
    async initialize() {
      this.destroyEditor();

      const cm = CodeMirror.fromTextArea(this.$refs.editor, {
        lineNumbers: true,
        tabSize: 2,
        theme: "monokai",
        extraKeys: {
          "Ctrl-Space": "autocomplete",
          "Shift-Tab": "indentLess",
          [this.cmCtrlOrCmd("F")]: "findPersistent",
          [this.cmCtrlOrCmd("R")]: "replace",
          [this.cmCtrlOrCmd("Shift-R")]: "replaceAll",
        },
        // @ts-expect-error not fully typed
        options: {
          closeOnBlur: false,
        },
        mode: this.mode,
        hint: this.hint,
        hintOptions: this.hintOptions,
        keyMap: this.userKeymap,
        getColumns: this.columnsGetter,
      });

      cm.setValue(this.value);

      if (typeof this.height === "number") {
        cm.setSize(null, this.height);
      }

      cm.addKeyMap({
        "Ctrl-/": () => this.editor.execCommand("toggleComment"),
        "Cmd-/": () => this.editor.execCommand("toggleComment"),
      });

      if (this.extraKeybindings) {
        cm.addKeyMap(this.extraKeybindings);
      }

      if (this.readOnly) {
        cm.setOption("readOnly", this.readOnly);
      }

      cm.on("change", (cm) => {
        this.$emit("input", cm.getValue());
      });

      cm.on("keydown", (_cm, e) => {
        if (this.$store.state.menuActive) {
          e.preventDefault();
        }
      });

      cm.on("focus", () => {
        this.$emit("update:focus", true);
      });

      cm.on("blur", () => {
        this.$emit("update:focus", false);
      });

      cm.on("cursorActivity", (cm) => {
        this.$emit("update:selection", cm.getSelection());
        this.$emit(
          "update:cursorIndex",
          cm.getDoc().indexFromPos(cm.getCursor())
        );
      });

      const cmEl = this.$refs.editor.parentNode.querySelector(".CodeMirror");

      cmEl.addEventListener("contextmenu", this.showContextMenu);

      if (this.userKeymap === "vim") {
        const codeMirrorVimInstance = cmEl.CodeMirror.constructor.Vim;

        if (!codeMirrorVimInstance) {
          console.error("Could not find code mirror vim instance");
        } else {
          if (this.vimConfig) {
            applyConfig(codeMirrorVimInstance, this.vimConfig);
          }
          await setKeybindingsFromVimrc(codeMirrorVimInstance);

          // cm throws if this is already defined, we don't need to handle that case
          try {
            codeMirrorVimInstance.defineRegister('*', new Register(this.$native.clipboard))
          } catch(e) {
            // nothing
          }
        }
      }

      if (this.plugins) {
        this.plugins.forEach((plugin: (cm: CodeMirror.Editor) => void) => {
          plugin(cm);
        });
      }

      this.editor = cm;

      this.$emit("update:initialized", true);
    },
    destroyEditor() {
      if (this.editor) {
        this.editor
          .getWrapperElement()
          .parentNode.removeChild(this.editor.getWrapperElement());
      }
    },
    showContextMenu(event) {
      const hasSelectedText = this.editor.getSelection();
      const selectionDepClass = hasSelectedText ? "" : "disabled";
      const menu = {
        options: [
          {
            name: "Undo",
            slug: "",
            handler: () => this.editor.execCommand("undo"),
            shortcut: this.ctrlOrCmd("z"),
          },
          {
            name: "Redo",
            slug: "",
            handler: () => this.editor.execCommand("redo"),
            shortcut: this.ctrlOrCmd("shift+z"),
          },
          {
            name: "Cut",
            slug: "",
            handler: () => {
              const selection = this.editor.getSelection();
              this.editor.replaceSelection("");
              this.$native.clipboard.writeText(selection);
            },
            class: selectionDepClass,
            shortcut: this.ctrlOrCmd("x"),
          },
          {
            name: "Copy",
            slug: "",
            handler: () => {
              const selection = this.editor.getSelection();
              this.$native.clipboard.writeText(selection);
            },
            class: selectionDepClass,
            shortcut: this.ctrlOrCmd("c"),
          },
          {
            name: "Paste",
            slug: "",
            handler: () => {
              const clipboard = this.$native.clipboard.readText();
              if (this.editor.getSelection()) {
                this.editor.replaceSelection(clipboard, "around");
              } else {
                const cursor = this.editor.getCursor();
                this.editor.replaceRange(clipboard, cursor);
              }
            },
            shortcut: this.ctrlOrCmd("v"),
          },
          {
            name: "Delete",
            slug: "",
            handler: () => {
              this.editor.replaceSelection("");
            },
            class: selectionDepClass,
          },
          {
            name: "Select All",
            slug: "",
            handler: () => {
              this.editor.execCommand("selectAll");
            },
            shortcut: this.ctrlOrCmd("a"),
          },
          {
            type: "divider",
          },
          {
            name: "Find",
            slug: "find",
            handler: () => {
              this.editor.execCommand("find");
            },
            shortcut: this.ctrlOrCmd("f"),
          },
          {
            name: "Replace",
            slug: "replace",
            handler: () => {
              this.editor.execCommand("replace");
            },
            shortcut: this.ctrlOrCmd("r"),
          },
          {
            name: "Replace All",
            slug: "replace_all",
            handler: () => {
              this.editor.execCommand("replaceAll");
            },
            shortcut: this.ctrlOrCmd("shift+r"),
          },
        ],
        event,
      };

      const customOptions = this.contextMenuOptions
        ? this.contextMenuOptions(event, menu.options)
        : undefined;

      if (customOptions === false) {
        return;
      }

      if (customOptions === undefined) {
        this.$bks.openMenu(menu);
      } else {
        this.$bks.openMenu({
          ...menu,
          options: customOptions,
        });
      }
    },
  },
  mounted() {
    this.initialize();
  },
  beforeDestroy() {
    this.destroyEditor();
  },
};
</script>
