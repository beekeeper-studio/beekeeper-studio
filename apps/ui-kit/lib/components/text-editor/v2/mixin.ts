import { TextEditor } from "./text-editor";
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
    lsClientConfig() {
      if (!this.textEditor) return;
      this.applyLSClientConfig();
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
    applyLSClientConfig() {
      if (this.lsClientConfig) {
        this.textEditor.initializeLSClientConfig({
          ...this.lsClientConfig,
          languageId: this.languageId,
        })
      } else {
        // TODO: Destroy the language server client
      }
    },
    initialize() {
      if (this.textEditor) {
        this.textEditor.destroy();
        this.textEditor = null;
      }

      const textEditor = new TextEditor();

      textEditor.initialize({ parent: this.$refs.editor });

      this.textEditor = textEditor;

      this.applyValue();
      this.applyReadOnly();
      this.applyLSClientConfig();
    },
  },

  async mounted() {
    await this.initialize();
  },

  beforeDestroy() {
    if (this.textEditor) {
      this.textEditor.destroy();
      this.textEditor = null;
    }
  },
};
