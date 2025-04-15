import "./monacoModConfig";
import * as monaco from "monaco-editor";

type Editor = monaco.editor.IStandaloneCodeEditor;

export default {
  props: {
    value: {
      type: String,
      default: "",
    },
    readOnly: {
      type: Boolean,
      default: false,
    },
    height: Number, // in px
  },

  data() {
    return {
      editor: null,
    };
  },

  computed: {
    heightAndStatus() {
      return {
        height: this.height,
        status: this.editor != null
      }
    },
    valueAndStatus() {
      return {
        value: this.value ?? "",
        status: this.editor != null,
      };
    },
    processedHeight() {
      return this.height ? this.height + "px" : "";
    },
  },

  methods: {
    subscribe(editor: Editor) {
      editor.onDidChangeModelContent(() => {
        this.$emit("bks-value-change", { value: editor.getValue() });
      });
    },
  },

  watch: {
    valueAndStatus() {
      const { value, status } = this.valueAndStatus;
      if (!status || !this.editor) return;
      if (this.editor.getValue() === value) return;
      // this.foundRootFold = false; // FIXME cm -> monaco
      // const scrollInfo = this.editor.getScrollInfo(); // FIXME: cm -> monaco
      this.editor.setValue(value);
      // this.editor.scrollTo(scrollInfo.left, scrollInfo.top); // FIXME: cm -> monaco
    },
    heightAndStatus() {
      const { status } = this.heightAndStatus;
      if (!status || !this.editor) return;
      this.editor.layout();
    },
    readOnly() {
      this.editor.updateOptions({ readOnly: this.readOnly });
    },
  },

  mounted() {
    const editor = monaco.editor.create(this.$refs.editor, {
      readOnly: this.readOnly,
    });
    this.subscribe(editor);
    this.editor = editor;
  },

  beforeDestroy() {
    this.editor.dispose();
  },
};
