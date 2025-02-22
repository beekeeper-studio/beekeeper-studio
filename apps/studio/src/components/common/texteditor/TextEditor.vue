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
import "codemirror/addon/fold/foldgutter";
import "codemirror/addon/fold/foldcode";
import "codemirror/addon/fold/brace-fold";
import "codemirror/addon/fold/foldgutter.css";
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
import CodeMirror, { TextMarker } from "codemirror";
import _ from "lodash";
import {
  setKeybindingsFromVimrc,
  applyConfig,
  Register,
} from "@/lib/editor/vim";
import { AppEvent } from "@/common/AppEvent";
import { keymapTypes } from "@/lib/db/types"

interface InitializeOptions {
  userKeymap?: typeof keymapTypes[number]['value']
}

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
    "plugins",
    "autoFocus",
    "lineNumbers",
    "foldGutter",
    "foldWithoutLineNumbers",
    "removeJsonRootBrackets",
    "forceInitialize",
    "bookmarks",
    "foldAll",
    "unfoldAll",
  ],
  data() {
    return {
      editor: null,
      foundRootFold: false,
      bookmarkInstances: [],
      markInstances: [],
      wasEditorFocused: false,
      firstInitialization: true,
    };
  },
  computed: {
    keymapTypes() {
      return this.$config.defaults.keymapTypes;
    },
    hasSelectedText() {
      return this.editorInitialized ? !!this.editor.getSelection() : false;
    },
    heightAndStatus() {
      return {
        height: this.height,
        status: this.editor != null
      }
    },
    valueAndStatus() {
      return {
        value: this.value,
        status: this.editor != null
      }
    },
    rootBindings() {
      return [
        { event: AppEvent.switchUserKeymap, handler: this.handleSwitchUserKeymap },
      ]
    },
  },
  watch: {
    valueAndStatus() {
      const { value, status } = this.valueAndStatus;
      if (!status || !this.editor) return;
      if (this.editor.getValue() === value) return; // Only setValue when necessary, as it can reset the cursor position, cause infinite loops, and whatnot.
      this.foundRootFold = false;
      const scrollInfo = this.editor.getScrollInfo();
      this.editor.setValue(value);
      this.editor.scrollTo(scrollInfo.left, scrollInfo.top);
    },
    forceInitialize() {
      this.initialize({
        userKeymap: this.$store.getters['settings/userKeymap'],
      });
    },
    mode() {
      this.editor?.setOption("mode", this.mode);
    },
    hint() {
      this.editor?.setOption("hint", this.hint);
    },
    hintOptions() {
      this.editor?.setOption("hintOptions", this.hintOptions);
    },
    heightAndStatus() {
      const { height, status } = this.heightAndStatus;
      if (!status || !this.editor) return;
      this.editor.setSize(null, height);
      this.editor.refresh();
    },
    readOnly() {
      this.editor?.setOption("readOnly", this.readOnly);
    },
    lineWrapping() {
      this.editor?.setOption("lineWrapping", this.lineWrapping);
    },
    async focus() {
      if (!this.editor) return
      if (this.focus) {
        this.editor.focus();
        await this.$nextTick();
        // this fixes the editor not showing because it doesn't think it's dom element is in view.
        // its a hit and miss error
        this.editor.refresh();
      } else {
        this.editor.display.input.blur();
      }
    },
    removeJsonRootBrackets() {
      if (this.removeJsonRootBrackets) {
        this.editor
          ?.getWrapperElement()
          .classList.add("remove-json-root-brackets");
      } else {
        this.editor
          ?.getWrapperElement()
          .classList.remove("remove-json-root-brackets");
      }
    },
    markers() {
      this.initializeMarkers();
    },
    bookmarks() {
      this.initializeBookmarks();
    },
    foldAll() {
      CodeMirror.commands.foldAll(this.editor)
    },
    unfoldAll() {
      CodeMirror.commands.unfoldAll(this.editor)
    },
  },
  methods: {
    focusEditor() {
      if(this.editor && this.autoFocus && this.wasEditorFocused){
        this.editor.focus();
        this.wasEditorFocused = false;
       }
    },
    handleBlur(){
      const activeElement = document.activeElement;
      if(activeElement.tagName === "TEXTAREA" || activeElement.className === "tabulator-tableholder"){
        this.wasEditorFocused = true;
      }
    },
    async initialize(options: InitializeOptions = {}) {
      this.destroyEditor();

      const cm = CodeMirror.fromTextArea(this.$refs.editor, {
        lineNumbers: this.lineNumbers ?? true,
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
        keyMap: options.userKeymap,
        getColumns: this.columnsGetter,
        ...(this.foldGutter && {
          gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
          foldGutter: true,
        }),
        ...(this.foldWithoutLineNumbers && {
          // gutters: ["CodeMirror-foldgutter"],
          foldGutter: true,
        }),
        // Remove JSON root key from folding
        ...(this.removeJsonRootBrackets && {
          foldGutter: {
            rangeFinder: (cm, start) => {
              // @ts-expect-error not fully typed
              const fold = CodeMirror.fold.auto(cm, start);
              if (fold && !this.foundRootFold) {
                this.foundRootFold = true;
                return;
              }
              return fold;
            },
          },
        }),
      });

      const classNames = ["text-editor"];

      if (this.foldWithoutLineNumbers) {
        classNames.push("fold-without-line-numbers");
      }

      if (this.removeJsonRootBrackets) {
        classNames.push("remove-json-root-brackets");
      }

      cm.getWrapperElement().classList.add(...classNames);

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

      if (this.lineWrapping) {
        cm.setOption("lineWrapping", this.lineWrapping);
      }

      cm.on("change", async (cm) => {
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

      cm.on("blur", (_cm, event) => {
        // This isn't really a blur because the receiving element is inside
        // the editor.
        if ((event.relatedTarget as HTMLElement)?.id.includes('CodeMirror')) {
          return
        }

        // This makes sure the editor is really blurred before emitting blur
        setTimeout(() => {
          this.$emit("update:focus", false);
        }, 0);
      });

      cm.on("cursorActivity", (cm) => {
        this.$emit("update:selection", cm.getSelection());
        this.$emit(
          "update:cursorIndex",
          cm.getDoc().indexFromPos(cm.getCursor())
        );
        this.$emit(
          "update:cursorIndexAnchor",
          cm.getDoc().indexFromPos(cm.getCursor('anchor'))
        );
      });

      const cmEl = this.$refs.editor.parentNode.querySelector(".CodeMirror");

      cmEl.addEventListener("contextmenu", this.showContextMenu);

      if (options.userKeymap === "vim") {
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
            codeMirrorVimInstance.defineRegister(
              "*",
              new Register(this.$native.clipboard)
            );
          } catch (e) {
            // nothing
          }
        }
      }

      if (this.plugins) {
        this.plugins.forEach((plugin: (cm: CodeMirror.Editor) => void) => {
          plugin(cm);
        });
      }

      if (this.firstInitialization && this.focus) {
        cm.focus();
      }

      this.editor = cm;
      this.firstInitialization = false;

      this.$nextTick(() => {
        this.initializeMarkers();
        this.initializeBookmarks();
        this.$emit("update:initialized", true);
      })
    },
    initializeMarkers() {
      const markers = this.markers || [];
      if (!this.editor) return;

      // Cleanup existing bookmarks
      this.markInstances.forEach((mark: TextMarker) => mark.clear());
      this.markInstances = [];

      for (const marker of markers) {
        let markInstance: TextMarker;
        if (marker.type === "error") {
          markInstance = this.editor.markText(marker.from, marker.to, {
            className: "error",
          });
        } else if (marker.type === "highlight") {
          markInstance = this.editor.markText(marker.from, marker.to, {
            className: "highlight",
          });
        } else if (marker.type === "custom") {
          markInstance = this.editor.markText(marker.from, marker.to, {
            ...(marker.element && { replacedWith: marker.element }),
          });
          if (marker.element && marker.onClick) {
            CodeMirror.on(marker.element, "click", marker.onClick);
            markInstance.on("clear", () => {
              CodeMirror.off(marker.element, "click", marker.onClick);
              marker.element.remove();
            });
          }
        }
        this.markInstances.push(markInstance);
      }
    },
    initializeBookmarks() {
      const bookmarks = this.bookmarks || [];
      if (!this.editor) return;

      // Cleanup existing bookmarks
      this.bookmarkInstances.forEach((mark) => mark.clear());
      this.bookmarkInstances = [];

      for (const bookmark of bookmarks) {
        const { element, line, ch, onClick } = bookmark;
        const mark = this.editor.setBookmark(CodeMirror.Pos(line, ch), {
          widget: element,
        });

        if (onClick) {
          const handleOnClick = (e) => onClick(e, mark);
          CodeMirror.on(element, "click", handleOnClick);
          mark.on("clear", () => {
            CodeMirror.off(element, "click", handleOnClick);
            element.remove();
          });
        }

        this.bookmarkInstances.push(mark);
      }
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
            handler: () => this.editor.execCommand("undo"),
            shortcut: this.ctrlOrCmd("z"),
            write: true,
          },
          {
            name: "Redo",
            handler: () => this.editor.execCommand("redo"),
            shortcut: this.ctrlOrCmd("shift+z"),
            write: true,
          },
          {
            name: "Cut",
            handler: () => {
              const selection = this.editor.getSelection();
              this.editor.replaceSelection("");
              this.$native.clipboard.writeText(selection);
            },
            class: selectionDepClass,
            shortcut: this.ctrlOrCmd("x"),
            write: true,
          },
          {
            name: "Copy",
            handler: () => {
              const selection = this.editor.getSelection();
              this.$native.clipboard.writeText(selection);
            },
            class: selectionDepClass,
            shortcut: this.ctrlOrCmd("c"),
          },
          {
            name: "Paste",
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
            write: true,
          },
          {
            name: "Delete",
            handler: () => {
              this.editor.replaceSelection("");
            },
            class: selectionDepClass,
            write: true,
          },
          {
            name: "Select All",
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
            handler: () => {
              this.editor.execCommand("find");
            },
            shortcut: this.ctrlOrCmd("f"),
          },
          {
            name: "Replace",
            handler: () => {
              this.editor.execCommand("replace");
            },
            shortcut: this.ctrlOrCmd("r"),
            write: true,
          },
          {
            name: "Replace All",
            handler: () => {
              this.editor.execCommand("replaceAll");
            },
            shortcut: this.ctrlOrCmd("shift+r"),
            write: true,
          },
        ],
        event,
      };

      if (this.readOnly) {
        menu.options = menu.options.filter((option) => !option.write);
      }

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
    handleSwitchUserKeymap(value) {
      this.initialize({ userKeymap: value });
    },
  },
  async mounted() {
    await this.initialize({
      userKeymap: this.$store.getters['settings/userKeymap'],
    });
    window.addEventListener('focus', this.focusEditor);
    window.addEventListener('blur', this.handleBlur);
    this.registerHandlers(this.rootBindings);
  },
  beforeDestroy() {
    window.removeEventListener('focus', this.focusEditor);
    window.removeEventListener('blur', this.handleBlur);
    this.destroyEditor();
    this.unregisterHandlers(this.rootBindings);
  },
};
</script>
