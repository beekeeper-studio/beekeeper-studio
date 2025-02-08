<template>
  <div class="BksUiKit BksTextEditor BksSqlTextEditor">
    <textarea
      name="editor"
      class="BksTextEditor-textarea BksSqlTextEditor-textarea editor"
      ref="editor"
      id=""
      cols="30"
      rows="10"
    />
  </div>
</template>

<script lang="ts">
import _ from "lodash";
import Vue, { PropType } from "vue";
import textEditorMixin from "../text-editor/mixin";
import { format, FormatOptions } from "sql-formatter";
import { autoquote, autoComplete, autoRemoveQueryQuotes } from "./plugins";
import { querySelection, QuerySelectionChangeParams } from "./querySelectionPlugin";
import { Options } from "sql-query-identifier";
import { BaseTable } from "../types";
import { ctrlOrCmd } from "../../utils/platform";
import ProxyEmit from "../mixins/ProxyEmit";

export default Vue.extend({
  mixins: [textEditorMixin, ProxyEmit],
  props: {
    mode: {
      type: textEditorMixin.props.mode,
      default: "text/x-sql",
    },
    hint: {
      type: textEditorMixin.props.hint,
      default: "sql",
    },
    contextMenuItems: {
      type: textEditorMixin.props.contextMenuItems,
      default() {
        return this.handleContextMenuItems(...arguments);
      },
    },
    /** Tables for autocompletion */
    tables: {
      type: Array as PropType<BaseTable[]>,
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
        const columns = table.columns?.map((c) => c.field) ?? [];
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
    handleContextMenuItems(_e: unknown, items: any[]) {
      const pivot = items.findIndex((o) => o.slug === "find");
      return [
        ...items.slice(0, pivot),
        {
          name: "Format Query",
          slug: "text-format",
          handler: this.formatSql,
          shortcut: ctrlOrCmd("shift+f"),
        },
        {
          type: "divider",
        },
        ...items.slice(pivot),
      ];
    },
    handleQuerySelectionChange(params: QuerySelectionChangeParams) {
      this.$emit("bks-query-selection-change", params);
    },
  },
  mounted() {
    this.internalKeybindings["Shift-Ctrl-F"] = this.formatSql;
    this.internalKeybindings["Shift-Cmd-F"] = this.formatSql;
    this.plugins = [
      autoquote,
      autoComplete,
      autoRemoveQueryQuotes(this.identifierDialect),
      querySelection(this.identifierDialect, this.handleQuerySelectionChange),
    ]
  }
});
</script>
