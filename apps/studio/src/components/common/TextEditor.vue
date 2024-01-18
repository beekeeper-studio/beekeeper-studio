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
import CodeMirror from "codemirror";
import { resolveLanguage } from '@/lib/editor/languageData'
import setKeybindingsFromVimrc from '@/lib/readVimrc'

export default {
  props: ["initialValue", "lang", "initializeOnMount"],
  data() {
    return {
      editor: null,
      value: "",
    };
  },
  computed: {
    keymapTypes() {
      return this.$config.defaults.keymapTypes;
    },
    userKeymap() {
      const settings = this.$store.state.settings?.settings;
      const value = settings?.keymap?.value;
      return value && this.keymapTypes.map((k) => k.value).includes(value)
        ? value
        : "default";
    },
  },
  watch: {
    lang() {
      const { mode, hint } = resolveLanguage(this.lang);
      this.editor.setOption("mode", mode);
      this.editor.setOption("hint", hint);
    },
    userKeymap() {
      this.initialize();
    },
  },
  methods: {
    initialize() {
      this.destroyEditor();

      const { mode, hint } = resolveLanguage(this.lang);

      const cm = CodeMirror.fromTextArea(this.$refs.editor, {
        lineNumbers: true,
        mode,
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
        hint,
        keyMap: this.userKeymap,
      });

      cm.setValue(this.value);

      cm.on("change", (cm) => {
        this.value = cm.getValue();
      });

      cm.on("keydown", (_cm, e) => {
        if (this.$store.state.menuActive) {
          e.preventDefault()
        }
      })

      if (this.userKeymap === "vim") {
        const codeMirrorVimInstance = this.$refs.editor.parentNode.querySelector(".CodeMirror").CodeMirror.constructor.Vim
        if (!codeMirrorVimInstance) {
          console.error("Could not find code mirror vim instance");
        } else {
          setKeybindingsFromVimrc(codeMirrorVimInstance);
        }
      }

      this.editor = cm;

      this.$emit("initialized", cm);

      return cm;
    },
    focus() {
      this.editor.focus()
      setTimeout(() => {
        // this fixes the editor not showing because it doesn't think it's dom element is in view.
        // its a hit and miss error
        this.editor.refresh()
      }, 1)
    },
    destroyEditor() {
      if (this.editor) {
        this.editor
          .getWrapperElement()
          .parentNode.removeChild(this.editor.getWrapperElement());
      }
    },
  },
  mounted() {
    if (this.initialValue) {
      this.value = this.initialValue;
    }
    // initialize on mount by default, but can be disabled
    if (this.initializeOnMount === undefined || this.initializeOnMount) {
      this.initialize();
    }
  },
  beforeDestroy() {
    this.destroyEditor();
  },
};
</script>
