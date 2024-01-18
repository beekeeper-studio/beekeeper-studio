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
import type { ConnectionType } from "@/common/interfaces/IConnection";

type Language = ConnectionType | "text" | "json";

interface CodeMirrorLanguage {
  mode: string | Record<string, unknown>;
  hint?: unknown;
}

function resolveLanguage(lang: Language): CodeMirrorLanguage {
  switch (lang) {
    case "mysql":
      return {
        mode: "text/x-mysql",
        // @ts-expect-error TODO not fully typed
        hint: CodeMirror.hint.sql,
      };
    case "mariadb":
      return {
        mode: "text/x-mariadb",
        // @ts-expect-error TODO not fully typed
        hint: CodeMirror.hint.sql,
      };
    case "postgresql":
    case "redshift":
    case "cockroachdb":
      return {
        mode: "text/x-pgsql",
        // @ts-expect-error TODO not fully typed
        hint: CodeMirror.hint.sql,
      };
    case "sqlserver":
      return {
        mode: "text/x-mssql",
        // @ts-expect-error TODO not fully typed
        hint: CodeMirror.hint.sql,
      };
    case "sqlite":
      return {
        mode: "text/x-sqlite",
        // @ts-expect-error TODO not fully typed
        hint: CodeMirror.hint.sql,
      };
    case "cassandra":
      return {
        mode: "text/x-cassandra",
        // @ts-expect-error TODO not fully typed
        hint: CodeMirror.hint.sql,
      };
    case "bigquery":
      return {
        mode: "text/x-sql",
        // @ts-expect-error TODO not fully typed
        hint: CodeMirror.hint.sql,
      };
    case "json":
      return {
        mode: {
          name: "javascript",
          json: true,
          statementIndent: 2,
        },
      };
    case "text":
    default:
      return {
        mode: "text",
      };
  }
}

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

      this.editor = cm;

      this.$emit("initialized", cm);

      return cm;
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
