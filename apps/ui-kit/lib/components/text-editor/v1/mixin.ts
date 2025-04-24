import "codemirror/addon/comment/comment";
import "codemirror/addon/dialog/dialog";
import "codemirror/addon/search/search";
import "codemirror/addon/search/jump-to-line";
import "codemirror/addon/scroll/annotatescrollbar";
import "codemirror/addon/search/matchesonscrollbar";
import "codemirror/addon/search/searchcursor";
import "codemirror/addon/fold/foldgutter";
import "codemirror/addon/fold/foldcode";
import "codemirror/addon/fold/brace-fold";
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
import { setKeybindings, Config, extendVimOnCodeMirror } from "./vim";
import { divider, InternalContextItem, openMenu } from "../../context-menu/menu";
import { writeClipboard, readClipboard } from "../../../utils/clipboard";
import { cmCtrlOrCmd } from "../../../utils/platform"
import { PropType } from "vue";
import { CustomMenuItems, useCustomMenuItems } from "../../context-menu/menu";

const hintMap = {
  sql: CodeMirror.hint.sql,
}

export default {
  props: {
    value: {
      type: String,
      default: "",
    },
    mode: [String, Object],
    hint: String,
    keybindings: Object as PropType<Record<string, () => void>>,
    vimConfig: Object as PropType<Config>,
    lineWrapping: Boolean,
    columnsGetter: Function,
    height: Number,
    readOnly: {
      type: Boolean,
      default: false,
    },
    focus: Boolean,
    contextMenuItems: [Array, Function] as PropType<CustomMenuItems>,
    markers: {
      type: Array,
      default: () => [],
    },
    cursor: String,
    initialized: Boolean,
    autoFocus: Boolean,
    lineNumbers: {
      type: Boolean,
      default: true,
    },
    foldGutter: Boolean,
    removeJsonRootBrackets: Boolean,
    forceInitialize: null,
    bookmarks: Array,
    foldAll: null,
    unfoldAll: null,
    /**
     * Configure the keymap to use. The default is 'default'. Other possible
     * values are 'vim', 'emacs' and 'sublime'.
     */
    keymap: {
      validator(value: string) {
        return ["default", "vim", "emacs", "sublime"].includes(value);
      },
      default: "default",
    },
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
    vimKeymaps: Array,
    clipboard: Object as PropType<Clipboard>
  },
  data() {
    return {
      editor: null,
      selectedText: "",
      foundRootFold: false,
      bookmarkInstances: [],
      markInstances: [],
      wasEditorFocused: false,
      editorInitialized: false,
      initializing: false,
      firstInitialization: true,

      // Add our own keybindings
      internalKeybindings: {},
      internalMarkers: [],
      internalContextMenuItems: [],
      plugins: [],
    };
  },
  computed: {
    hasSelectedText() {
      return this.editorInitialized ? this.selectedText : false;
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
    },
    hintOptions() {
      return {}
    },
    allMarkers() {
      return this.internalMarkers.concat(this.markers);
    },
  },
  watch: {
    valueAndStatus() {
      const { value, status } = this.valueAndStatus;
      if (!status || !this.editor) return;
      if (this.editor.getValue() === value) return
      this.foundRootFold = false;
      const scrollInfo = this.editor.getScrollInfo();
      this.editor.setValue(value);
      this.editor.scrollTo(scrollInfo.left, scrollInfo.top);
    },
    forceInitialize() {
      this.initialize();
    },
    keymap() {
      this.editor.setOption("keyMap", this.keymap);

      if (this.keymap === "vim") {
        const cmEl = this.$refs.editor.parentNode.querySelector(".CodeMirror");
        extendVimOnCodeMirror(cmEl, this.vimConfig, this.vimKeymaps, this.clipboard);
      }
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
    allMarkers() {
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

      const indicatorOpen = document.createElement("span");
      indicatorOpen.classList.add("foldgutter", "btn-fab", "open-close");
      indicatorOpen.innerHTML = `<i class="dropdown-icon material-icons">keyboard_arrow_down</i>`;

      const indicatorFolded = document.createElement("span");
      indicatorFolded.classList.add("foldgutter", "btn-fab", "open-close");
      indicatorFolded.innerHTML = `<i class="dropdown-icon material-icons">keyboard_arrow_right</i>`;

      const cm = CodeMirror.fromTextArea(this.$refs.editor, {
        value: this.value ?? "",
        lineNumbers: this.lineNumbers,
        tabSize: 2,
        extraKeys: {
          "Ctrl-Space": "autocomplete",
          "Shift-Tab": "indentLess",
          [cmCtrlOrCmd("F")]: "findPersistent",
          [cmCtrlOrCmd("R")]: "replace",
          [cmCtrlOrCmd("Shift-R")]: "replaceAll",
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
          gutters: ["CodeMirror-linenumbers", { className: "CodeMirror-foldgutter", style: "width: 18px" }],
          foldGutter: { indicatorOpen, indicatorFolded },
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

      const classNames = [];

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

      cm.addKeyMap(this.internalKeybindings);
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
        await this.$nextTick()
        this.$emit("update:value", cm.getValue());
        this.$emit("bks-value-change", { value: cm.getValue() });
      });

      cm.on("keydown", (_cm, e) => {
        // if (this.$store.state.menuActive) {texteidtortexteidtor
        //   e.preventDefault();
        // }
      });

      cm.on("focus", (_cm, event) => {
        this.$emit("update:focus", true);
        this.$emit("bks-focus", { event });
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
          this.$emit("bks-blur", { event });
        }, 0);
      });

      cm.on("cursorActivity", (cm) => {
        this.selectedText = cm.getSelection()
      });

      const cmEl = this.$refs.editor.parentNode.querySelector(".CodeMirror");

      cmEl.addEventListener("contextmenu", this.showContextMenu);

      if (this.keymap === "vim") {
        extendVimOnCodeMirror(cmEl, this.vimConfig, this.vimKeymaps, this.clipboard);
      }

      if (this.plugins) {
        this.plugins.forEach((plugin: (cm: CodeMirror.Editor) => void) => {
          plugin(cm);
        });
      }

      if (this.value) {
        // One more time because sometimes it doesn't set
        cm.setValue(this.value)
      }

      if (this.firstInitialization && this.focus) {
        cm.focus();
      }

      this.editor = cm;
      this.firstInitialization = false;

      this.initializing = false

      this.$nextTick(() => {
        this.initializeMarkers();
        this.initializeBookmarks();
        this.$emit("update:initialized", true);
        this.$emit("bks-initialized", { codemirror: cm });
      })
    },
    initializeMarkers() {
      const markers = this.allMarkers;
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
      event.preventDefault()
      const hasSelectedText = this.editor.getSelection();
      const selectionDepClass = hasSelectedText ? "" : "disabled";
      const menu = {
        options: [
          {
            label: 'Undo',
            id: "text-undo",
            handler: () => this.editor.execCommand("undo"),
            shortcut: "Control+Z",
            write: true,
          },
          {
            label: "Redo",
            id: "text-redo",
            handler: () => this.editor.execCommand("redo"),
            shortcut: "Shift+Z",
            write: true,
          },
          {
            label: "Cut",
            id: "text-cut",
            handler: () => {
              const selection = this.editor.getSelection();
              this.editor.replaceSelection("");
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
              const selection = this.editor.getSelection();
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
              if (this.editor.getSelection()) {
                this.editor.replaceSelection(clipboard, "around");
              } else {
                const cursor = this.editor.getCursor();
                this.editor.replaceRange(clipboard, cursor);
              }
            },
            shortcut: "Control+V",
            write: true,
          },
          {
            label: "Delete",
            id: "text-delete",
            handler: () => {
              this.editor.replaceSelection("");
            },
            class: selectionDepClass,
            write: true,
          },
          {
            label: "Select All",
            id: "text-select-all",
            handler: () => {
              this.editor.execCommand("selectAll");
            },
            shortcut: "Control+A",
          },
          divider,
          {
            label: "Find",
            id: "text-find",
            handler: () => {
              this.editor.execCommand("find");
            },
            shortcut: "Control+F",
          },
          {
            label: "Replace",
            id: "text-replace",
            handler: () => {
              this.editor.execCommand("replace");
            },
            shortcut: "Control+R",
            write: true,
          },
          {
            label: "Replace All",
            id: "text-replace-all",
            handler: () => {
              this.editor.execCommand("replaceAll");
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

      let items = useCustomMenuItems(event, undefined, menu.options, this.internalContextMenuItems);
      items = useCustomMenuItems(event, undefined, items as InternalContextItem<unknown>[], this.contextMenuItems);
      openMenu({ event, options: items });
    },
  },
  async mounted() {
    await this.initialize();
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
