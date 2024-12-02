<template>
  <text-editor
    v-bind="$attrs"
    v-on="$listeners"
    hint="sql"
    :keybindings="extendedKeybindings"
    :context-menu-options="handleContextMenuOptions"
    :plugins="extendedPlugins"
    :auto-focus="true"
  />
</template>

<script lang="ts">
import Vue, { PropType } from "vue";
import { TextEditor } from "../text-editor";
import { format, FormatOptions } from "sql-formatter";
import { autoquote, autoComplete, autoRemoveQueryQuotes } from "./plugins";
import { Options } from "sql-query-identifier";

export default Vue.extend({
  components: { TextEditor },
  props: {
    keybindings: Object as PropType<Record<string, () => void>>,
    plugins: Array as PropType<any[]>,
    formatterDialect: String as PropType<FormatOptions['language']>,
    identifierDialect: String as PropType<Options['dialect']>,
  },
  computed: {
    extendedKeybindings() {
      console.error("attrs keybindings", this.keybindings);
      return {
        "Shift-Ctrl-F": this.formatSql,
        "Shift-Cmd-F": this.formatSql,
        ...(this.keybindings || {}),
      };
    },
    extendedPlugins() {
      return [
        autoquote,
        autoComplete,
        autoRemoveQueryQuotes(this.identifierDialect),
        ...(this.plugins || []),
      ];
    },
  },
  methods: {
    formatSql() {
      const formatted = format(this.$attrs.value, {
        language: this.formatterDialect,
      });
      this.$emit("input", formatted);
    },
    handleContextMenuOptions(e: unknown, options: any[]) {
      const pivot = options.findIndex((o) => o.slug === "find");
      return [
        ...options.slice(0, pivot),
        {
          name: "Format Query",
          slug: "format",
          handler: this.formatSql,
          shortcut: this.ctrlOrCmd("shift+f"),
        },
        {
          type: "divider",
        },
        ...options.slice(pivot),
      ];
    },
  },
});
</script>
