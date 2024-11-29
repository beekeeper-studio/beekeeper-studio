<template>
  <text-editor
    v-bind="$attrs"
    v-on="$listeners"
    hint="sql"
    :value="value"
    :extra-keybindings="keybindings"
    :columns-getter="columnsGetter"
    :context-menu-options="handleContextMenuOptions"
    :plugins="plugins"
    :auto-focus="true"
  />
</template>

<script lang="ts">
import Vue from "vue";
import TextEditor from "./TextEditor.vue";
import { mapState, mapGetters } from "vuex";
import { plugins } from "@/lib/editor/utils";
import { format } from "sql-formatter";

export default Vue.extend({
  components: { TextEditor },
  props: ["value", "identifierDialect", "formatterDialect"],
  computed: {
    ...mapGetters(['defaultSchema', 'dialectData']),
    ...mapState(["tables"]),
    keybindings() {
      return {
        "Shift-Ctrl-F": this.formatSql,
        "Shift-Cmd-F": this.formatSql,
      };
    },
    plugins() {
      const editorPlugins = [
        plugins.autoquote,
        plugins.autoComplete,
        plugins.autoRemoveQueryQuotes(this.identifierDialect),
        plugins.queryMagic(() => this.defaultSchema, () => this.tables)
      ];

      return editorPlugins;
    },
  },
  methods: {
    formatSql() {
      const formatted = format(this.value, {
        language: this.formatterDialect,
      });
      this.$emit("input", formatted);
    },
    async columnsGetter(tableName: string) {
      let tableToFind = this.tables.find(
        (t) => t.name === tableName || `${t.schema}.${t.name}` === tableName
      );
      if (!tableToFind) return null;
      // Only refresh columns if we don't have them cached.
      if (!tableToFind.columns?.length) {
        await this.$store.dispatch("updateTableColumns", tableToFind);
        tableToFind = this.tables.find(
          (t) => t.name === tableName || `${t.schema}.${t.name}` === tableName
        );
      }

      return tableToFind?.columns.map((c) => c.columnName);
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
