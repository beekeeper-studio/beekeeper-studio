<template>
  <!-- <text-editor -->
    <!-- :value="value" -->
    <!-- @input="$emit('input', $event)" -->
    <!-- :hint="hint" -->
    <!-- :mode="dialectData.textEditorMode" -->
    <!-- :hint-options="hintOptions" -->
    <!-- :columns-getter="columnsGetter" -->
    <!-- :auto-focus="true" -->
    <!-- @update:focus="$emit('update:focus', $event)" -->
    <!-- @update:selection="$emit('update:selection', $event)" -->
    <!-- @update:cursorIndex="$emit('update:cursorIndex', $event)" -->
    <!-- @update:cursorIndexAnchor="$emit('update:cursorIndexAnchor', $event)" -->
    <!-- @update:initialized="$emit('update:initialized', $event)" -->
  <!-- /> -->
  <shell></shell>
</template>

<script lang="ts">
import TextEditor from "./TextEditor.vue";
import CodeMirror from "codemirror";
import { Shell } from "@mongosh/browser-repl";
import { mapGetters, mapState } from 'vuex';

export default {
  components: { TextEditor, Shell },
  props: ["value"],
  data() {
    return {
      editor: null,
    }
  },
  computed: {
    ...mapGetters(['defaultSchema', 'dialectData', 'isUltimate']),
    ...mapState(["tables"]),
    hint() {
      // @ts-expect-error not fully typed
      return CodeMirror.hint.javascript;
    },
    hintOptions() {
      // We do this so we can order the autocomplete options
      const firstTables = {};
      const secondTables = {};
      const thirdTables = {};

      this.tables.forEach((table) => {
        // don't add table names that can get in conflict with database schema
        if (/\./.test(table.name)) return;

        // Previously we had to provide a table: column[] mapping.
        // we don't need to provide the columns anymore because we fetch them dynamically.
        if (!table.schema) {
          firstTables[table.name] = [];
          return;
        }

        if (table.schema === this.defaultSchema) {
          firstTables[table.name] = [];
          secondTables[`${table.schema}.${table.name}`] = [];
        } else {
          thirdTables[`${table.schema}.${table.name}`] = [];
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
  }
}
</script>
