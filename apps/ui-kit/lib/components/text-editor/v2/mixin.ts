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
      if (this.value !== this.textEditor?.getValue()) {
        this.textEditor?.setValue(this.value);
      }
    },
    readOnly() {
      this.textEditor?.setReadOnly(this.readOnly);
    },
    lsClientConfig() {
      this.textEditor?.initializeLSClientConfig({
        ...this.lsClientConfig,
        languageId: this.languageId,
      })
    },
  },

  methods: {
    initialize() {
      if (this.textEditor) {
        this.textEditor.destroy();
        this.textEditor = null;
      }

      const textEditor = new TextEditor();

      textEditor.initialize({
        parent: this.$refs.editor,
      });

      textEditor.setValue(this.value);
      textEditor.setReadOnly(this.readOnly);
      if (this.lsClientConfig) {
        textEditor.initializeLSClientConfig({
          ...this.lsClientConfig,
          languageId: this.languageId,
        })
      }

      this.textEditor = textEditor;
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
