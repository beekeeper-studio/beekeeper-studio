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
import "./vendor/sql-hint";
import "./vendor/show-hint";
import "./CodeMirrorDefinitions";
import "codemirror/addon/merge/merge";
import 'codemirror/keymap/vim.js'
import CodeMirror, { TextMarker } from "codemirror";
import _ from "lodash";
import { setKeybindings, applyConfig, Register } from "./vim";
import { openMenu } from "../ContextMenu/menu";
import { writeClipboard, readClipboard } from "../../utils/clipboard";
import { isMacLike } from "../../utils/platform"

const hintMap = {
  sql: CodeMirror.hint.sql,
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
    /**
     * TextEditor has a set of default context menu options. You can extend it
     * or override it by passing a function to `contextMenuOptions`.
     *
     * For example:
     *
     * ```js
     * const contextMenuOptions = (event, menu: ) => {
     *
     * }
     */
    "contextMenuOptions",
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
    "forceInitizalize",
    "bookmarks",
    "foldAll",
    "unfoldAll",
    /**
     * Configure the keymap to use. The default is 'default'. Other possible
     * values are 'vim', 'emacs' and 'sublime'.
     */
    "keymap",
    /**
     * Configure custom key mappings in vim. `vimKeymaps` accepts an array of
     * objects that contain the following properties:
     * - lhs: The key you want to map
     * - rhs: The key you want to map to
     * - mode: (optional) The mode in which you want to map the key ('normal', 'visual', 'insert')
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
     */
    "vimKeymaps",
  ],
  data() {
    return {
      editor: null,
      foundRootFold: false,
      bookmarkInstances: [],
      markInstances: [],
      wasEditorFocused: false,
      valueChangeByCodeMirror: false,
      editorInitialized: false,
      initializing: false,
    };
  },
  computed: {
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
        value: this.value ?? "",
        status: this.editor != null
      }
    }
  },
  watch: {
    valueAndStatus() {
      if (this.valueChangeByCodeMirror) {
        this.valueChangeByCodeMirror = false;
        return
      }
      const { value, status } = this.valueAndStatus;
      if (!status || !this.editor) return;
      this.foundRootFold = false;
      const scrollInfo = this.editor.getScrollInfo();
      this.editor.setValue(value);
      this.editor.scrollTo(scrollInfo.left, scrollInfo.top);
    },
    forceInitizalize() {
      this.initialize();
    },
    keymap() {
      this.initialize();
    },
    vimConfig() {
      this.initialize();
    },
    vimKeymaps() {
      if (!this.editor || this.keymap !== 'vim') {
        return
      }

      const vimKeymaps = this.vimKeymaps ?? [];

      if (!_.isArray(vimKeymaps)) {
        console.error("vimKeymaps must be an array");
        return
      }

      const cmEl = this.$refs.editor.parentNode.querySelector(".CodeMirror");
      const codeMirrorVimInstance = cmEl.CodeMirror.constructor.Vim;

      codeMirrorVimInstance.mapclear('normal');
      codeMirrorVimInstance.mapclear('visual');
      codeMirrorVimInstance.mapclear('insert');

      setKeybindings(codeMirrorVimInstance, vimKeymaps);
    },
    mode() {
      this.editor?.setOption("mode", this.mode);
    },
    hint() {
      const hint = hintMap[this.hint];
      if (!hint) {
        throw new Error(`Unknown hint: ${this.hint}. Possible values: ${Object.keys(hintMap)}`);
      }
      this.editor?.setOption("hint", hint);
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
    async initialize() {
      this.initializing = true

      await this.$nextTick()

      this.destroyEditor();

      const cm = CodeMirror.fromTextArea(this.$refs.editor, {
        value: this.value ?? "",
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
        keyMap: this.keymap ?? "default",
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

      if (typeof this.height === "number") {
        cm.setSize(null, this.height);
      }

      cm.addKeyMap({
        "Ctrl-/": () => this.editor.execCommand("toggleComment"),
        "Cmd-/": () => this.editor.execCommand("toggleComment"),
      });

      if (this.keybindings) {
        cm.addKeyMap(this.keybindings);
      }

      if (this.readOnly) {
        cm.setOption("readOnly", this.readOnly);
      }

      if (this.lineWrapping) {
        cm.setOption("lineWrapping", this.lineWrapping);
      }

      cm.on("change", async (cm) => {
        this.valueChangeByCodeMirror = true;
        await this.$nextTick()
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
      });

      const cmEl = this.$refs.editor.parentNode.querySelector(".CodeMirror");

      cmEl.addEventListener("contextmenu", this.showContextMenu);

      if (this.keymap === "vim") {
        const codeMirrorVimInstance = cmEl.CodeMirror.constructor.Vim;

        if (!codeMirrorVimInstance) {
          console.error("Could not find code mirror vim instance");
        } else {
          if (this.vimConfig) {
            applyConfig(codeMirrorVimInstance, this.vimConfig);
          }

          const vimKeymaps = this.vimKeymaps ?? [];
          if (_.isArray(vimKeymaps)) {
            setKeybindings(codeMirrorVimInstance, vimKeymaps);
          } else {
            console.error("vimKeymaps must be an array");
          }

          // cm throws if this is already defined, we don't need to handle that case
          try {
            codeMirrorVimInstance.defineRegister(
              "*",
              new Register(navigator)
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

      if (this.value) {
        // One more time because sometimes it doesn't set
        this.valueChangeByCodeMirror = true
        cm.setValue(this.value)
      }

      this.editor = cm;

      this.initializing = false

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
              writeClipboard(selection);
            },
            class: selectionDepClass,
            shortcut: this.ctrlOrCmd("x"),
            write: true,
          },
          {
            name: "Copy",
            handler: async () => {
              const selection = this.editor.getSelection();
              await writeClipboard(selection);
            },
            class: selectionDepClass,
            shortcut: this.ctrlOrCmd("c"),
          },
          {
            name: "Paste",
            handler: async () => {
              const clipboard = await readClipboard();
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
        openMenu(menu);
      } else {
        openMenu({
          ...menu,
          options: customOptions,
        });
      }
    },
    // For codemirror
    cmCtrlOrCmd(key: string) {
      if (isMacLike) return `Cmd-${key}`
      return `Ctrl-${key}`
    },
    // For anything else
    ctrlOrCmd(key) {
      if (isMacLike) return `meta+${key}`
      return `ctrl+${key}`
    },
  },
  mounted() {
    this.initialize();
    if (this.focus) {
      this.editor.focus();
    }
    window.addEventListener('focus', this.focusEditor);
    window.addEventListener('blur', this.handleBlur);
  },
  beforeDestroy() {
    window.removeEventListener('focus', this.focusEditor);
    window.removeEventListener('blur', this.handleBlur);
    this.destroyEditor();
  },
};
</script>
