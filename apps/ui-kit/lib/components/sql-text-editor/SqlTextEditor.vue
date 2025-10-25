<template>
  <div class="text-editor-wrapper">
    <button
      v-if="allowPresets"
      type="button"
      class="BksIconButton"
      aria-label="Open preset formatter"
      title="Open preset formatter"
      @click="formatterPreset"
    >
      <i class="material-icons">settings</i>
    </button>
    <div class="BksUiKit BksTextEditor BksSqlTextEditor" ref="editor" />
  </div>
</template>

<script lang="ts">
import mixin from "../text-editor/mixin";
import props from "./props";
import { SqlTextEditor } from "./SqlTextEditor";
import { Entity } from "../types";
import {
  InternalContextItem,
} from "../context-menu";
import { format } from "sql-formatter";
import ProxyEmit from "../mixins/ProxyEmit";
import Vue from "vue";

export default Vue.extend({
  data() {
    return {
      internalActionsKeymap: [{
        key: "Mod-Shift-f",
        // @ts-ignore this does exist ts you moron
        run: this.formatSql
      }],
      selectedQuery: "",
    }
  },
  mixins: [mixin, ProxyEmit],

  props,

  watch: {
    defaultSchema() {
      if (!this.textEditor) return;
      this.applyCompletionSource();
    },
    entities() {
      if (!this.textEditor) return;
      this.applyCompletionSource();
    },
    formatterConfig() {
      this.formatSql()
    }
  },

  methods: {
    // TextEditor overrides
    constructTextEditor() {
      return new SqlTextEditor({
        identiferDialect: this.identifierDialect,
        paramTypes: this.paramTypes,
        onQuerySelectionChange: (params) => {
          this.selectedQuery = params.selectedQuery.text;
          this.$emit("bks-query-selection-change", params)
        },
        columnsGetter: (entity: Entity) => {
          return this.columnsGetter?.(entity.name) || [];
        },
      });
    },
    initialized() {
      this.applyCompletionSource();
    },
    applyCompletionSource() {
      this.textEditor.setCompletionSource({
        defaultSchema: this.defaultSchema,
        entities: this.entities,
      });
    },
    contextMenuItemsModifier(_event, _target, items: InternalContextItem<unknown>[]): InternalContextItem<unknown>[] {
      return [
        ...items,
        {
          label: `Format Query`,
          id: "text-format",
          handler: this.formatSql,
          shortcut: "Control+Shift+F",
          // items: [
          //   {
          //     label: "Standard",
          //     id: "format-standard",
          //     handler: () => this.formatSqlWithPreset('standard'),
          //   },
          //   {
          //     label: "Compact",
          //     id: "format-compact",
          //     handler: () => this.formatSqlWithPreset('compact'),
          //   },
          // ]
        }
      ];
    },
    formatterPreset() {
      this.$emit("bks-show-formatter-presets", { showFormatter: true });
    },
    // Non-TextEditor overrides
    formatSql() {
      if(this.value == null || this.value.trim() === '') return

      const formatted = format(this.value, {
        language: this.formatterDialect,
        ...this.formatterConfig
      });
      this.$emit("bks-value-change", { value: formatted });
    },
  },

  mounted() {
    this.internalContextMenuItems = this.contextMenuItemsModifier;
    this.internalMenuContextModifiers.push((context) => {
      return {
        ...context,
        selectedQuery: this.selectedQuery,
      };
    });
    this.formatSql()
  },
});
</script>
