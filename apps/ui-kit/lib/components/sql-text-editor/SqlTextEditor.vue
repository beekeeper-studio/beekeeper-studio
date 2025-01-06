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
import "./SqlTextEditor.scss";
import _ from "lodash";
import Vue, { PropType } from "vue";
import textEditorMixin from "../text-editor/mixin";
import { format, FormatOptions } from "sql-formatter";
import { autoquote, autoComplete, autoRemoveQueryQuotes } from "./plugins";
import { Options } from "sql-query-identifier";
// FIXME move models outside table list
import { Table } from "../table-list/models";

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
    /** Tables for autocompletion */
    tables: {
      type: Array as PropType<Table[]>,
      default() {
        return [];
      },
    },
    // FIXME routines are not implemented yet
    routines: {
      type: Array,
      default() {
        return [];
      },
    },
    defaultSchema: {
      type: String,
      default: "public",
    },
    formatterDialect: {
      type: String as PropType<FormatOptions['language']>,
      default: "sql",
    },
    identifierDialect: {
      type: String as PropType<Options['dialect']>,
      default: "generic",
    },
  },
  computed: {
    hintOptions() {
      // We do this so we can order the autocomplete options
      const firstTables = {};
      const secondTables = {};
      const thirdTables = {};

      this.tables.forEach((table) => {
        const columns = table.columns?.map((c) => c.name) ?? [];
        // don't add table names that can get in conflict with database schema
        if (/\./.test(table.name)) return;

        // Previously we had to provide a table: column[] mapping.
        // we don't need to provide the columns anymore because we fetch them dynamically.
        if (!table.schema) {
          firstTables[table.name] = columns;
          return;
        }

        if (table.schema === this.defaultSchema) {
          firstTables[table.name] = columns;
          secondTables[`${table.schema}.${table.name}`] = columns;
        } else {
          thirdTables[`${table.schema}.${table.name}`] = columns;
        }
      });

      const sorted = Object.assign(
        firstTables,
        Object.assign(secondTables, thirdTables)
      );

      return { tables: sorted };
    }
  },
  methods: {
    formatSql() {
      const formatted = format(this.value, {
        language: this.formatterDialect,
      });
      this.$emit("bks-value-change", formatted);
    },
    handleContextMenuOptions(_e: unknown, options: any[]) {
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
  mounted() {
    this.internalKeybindings["Shift-Ctrl-F"] = this.formatSql;
    this.internalKeybindings["Shift-Cmd-F"] = this.formatSql;
  }
});
</script>
