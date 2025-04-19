import { TextEditor } from "./TextEditor";
import props from "./props";

export default {
  props,

  data() {
    return {
      textEditor: null,
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

      textEditor.initialize({ parent: this.$refs.editor });

      this.textEditor = textEditor;

      this.applyValue();
      this.applyReadOnly();
      this.applyFocus();
      this.applyLSClientConfig();

      this.initialized?.();
    },
  },

  mounted() {
    this.initialize();
  },

  beforeDestroy() {
    if (this.textEditor) {
      this.textEditor.destroy();
      this.textEditor = null;
    }
  },
};
