<template>
  <div class="BksUiKit BksDataEditor" ref="main">
    <entity-list
      v-bind="entityListProps"
      :entities="entities"
      proxyEmit
      @bks-entity-dblclick="handleEntityDblclick"
    />
    <div class="BksDataEditor-right-container" ref="right">
      <div class="BksDataEditor-sql-editor">
        <sql-text-editor
          v-bind="sqlTextEditorProps"
          focus
          :entities="entities"
          :keybindings="keybindings"
          proxyEmit
          @bks-value-change="handleValueChange"
        />
        <div class="BksDataEditor-run">
          <button @click="submitQuery" title="Ctrl-Enter">Run</button>
        </div>
      </div>
      <div class="BksDataEditor-table">
        <div
          class="BksDataEditor-initial-placeholder"
          v-show="showInitialPlaceholder"
        >
          Select a table to view data or run a query.
        </div>
        <table-component
          v-show="!showInitialPlaceholder"
          v-bind="tableProps"
          :columns="columns"
          :data="data"
          proxyEmit
          @bks-foreign-key-go-to="handleForeignKeyGoTo"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import _ from "lodash";
import Vue, { PropType } from "vue";
import EntityList from "../entity-list/EntityList.vue";
import SqlTextEditor from "../sql-text-editor/v2/SqlTextEditor.vue";
import TableComponent from "../table/Table.vue";
import Split from "split.js";
import { Table } from "./types";
import { Entity } from "../types";

export default Vue.extend({
  components: { EntityList, SqlTextEditor, TableComponent },
  props: {
    entities: {
      type: Array as PropType<Table[]>,
      default: () => [{ columns: [], data: [] }],
    },
    entityListProps: {
      type: Object,
      default: () => ({}),
    },
    sqlTextEditorProps: {
      type: Object,
      default: () => ({}),
    },
    tableProps: {
      type: Object,
      default: () => ({}),
    },
  },
  data() {
    return {
      sql: "",
      data: [],
      columns: [],
      mainSplit: null,
      showInitialPlaceholder: true,
    };
  },
  watch: {},
  computed: {
    keybindings() {
      return {
        "Ctrl-Enter": this.submitQuery,
        "Cmd-Enter": this.submitQuery,
      };
    },
  },
  methods: {
    setTable(table: Table) {
      this.showInitialPlaceholder = false;
      this.data = table.data;
      this.columns = table.columns;
    },
    submitQuery() {
      this.$emit("bks-query-submit", { query: this.sql });
    },
    handleValueChange(detail: { value: string }) {
      this.sql = detail.value;
    },
    handleEntityDblclick(detail: { entity: Entity }) {
      this.setTable(detail.entity);
    },
    handleForeignKeyGoTo({ field }) {
      const foreignTable = this.entities.find(
        (t) => t === this.columns.find((c) => c.field === field)?.toTable
      );
      if (foreignTable) {
        this.setTable(foreignTable);
      }
    },
  },
  mounted() {
    const mainEl = this.$refs.main;
    const rightEl = this.$refs.right;

    this.mainSplit = Split(mainEl.children, {
      direction: "horizontal",
      gutterStyle: () => '',
      elementStyle: (_dimension, size) => ({
        "flex-basis": `calc(${size}%)`,
      }),
      gutter: (_index, direction) => {
        const gutter = document.createElement("div");
        gutter.className = `BksDataEditor-gutter gutter gutter-${direction}`;
        return gutter;
      },
      expandToMin: true,
    } as Split.Options);

    this.rightSplit = Split(rightEl.children, {
      direction: "vertical",
      gutterStyle: () => '',
      elementStyle: (_dimension, size) => ({
        "flex-basis": `calc(${size}%)`,
      }),
      gutter: (_index, direction) => {
        const gutter = document.createElement("div");
        gutter.className = `BksDataEditor-gutter gutter gutter-${direction}`;
        return gutter;
      },
      expandToMin: true,
    } as Split.Options);
  },
});
</script>
