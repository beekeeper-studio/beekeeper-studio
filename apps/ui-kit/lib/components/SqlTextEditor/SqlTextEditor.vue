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

<style lang="scss">
@import '../TextEditor/TextEditor.scss';
</style>

<script lang="ts">
import Vue, { PropType } from "vue";
import textEditorMixin from "../TextEditor/mixin";
import { format, FormatOptions } from "sql-formatter";
import { autoquote, autoComplete, autoRemoveQueryQuotes } from "./plugins";
import { Options } from "sql-query-identifier";

export default Vue.extend({
  mixins: [textEditorMixin],
  props: {
    mode: {
      type: textEditorMixin.props.mode,
      default: "text/x-sql",
    },
    hint: {
      type: textEditorMixin.props.hint,
      default: "sql",
    },
    keybindings: {
      type: textEditorMixin.props.keybindings,
      default() {
        return {
          "Shift-Ctrl-F": this.formatSql,
          "Shift-Cmd-F": this.formatSql,
        }
      }
    },
    plugins: {
      type: textEditorMixin.props.plugins,
      default() {
        return [
          autoquote,
          autoComplete,
          autoRemoveQueryQuotes(this.identifierDialect),
        ];
      }
    },
    contextMenuOptions: {
      type: textEditorMixin.props.contextMenuOptions,
      default() {
        return this.handleContextMenuOptions(...arguments);
      },
    },
    formatterDialect: String as PropType<FormatOptions['language']>,
    identifierDialect: String as PropType<Options['dialect']>,
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
