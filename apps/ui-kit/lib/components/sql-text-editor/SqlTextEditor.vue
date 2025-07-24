<template>
  <div class="BksUiKit BksTextEditor BksSqlTextEditor" ref="editor"></div>
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
  },

  methods: {
    // TextEditor overrides
    constructTextEditor() {
      return new SqlTextEditor({
        identiferDialect: this.identifierDialect,
        onQuerySelectionChange: (params) => {
          this.$emit("bks-query-selection-change", params)
        },
      });
    },
    initialized() {
      this.applyCompletionSource();
      this.applyRequestColumnsListener();
    },
    applyCompletionSource() {
      this.textEditor.setCompletionSource({
        defaultSchema: this.defaultSchema,
        entities: this.entities,
      });
    },
    applyRequestColumnsListener() {
      if (this.columnsGetter) {
        this.textEditor.setRequestColumnsListener((entity: Entity) =>
          this.columnsGetter(entity.name)
        );
      } else {
        this.textEditor.setRequestColumnsListener(null);
      }
    },
    contextMenuItemsModifier(_event, _target, items: InternalContextItem<unknown>[]): InternalContextItem<unknown>[] {
      return [
        ...items,
        {
          label: `Format Query`,
          id: "text-format",
          handler: this.formatSql,
          shortcut: "Control+Shift+F",
        }
      ];
    },

    // Non-TextEditor overrides
    formatSql() {
      const formatted = format(this.value, {
        language: this.formatterDialect,
      });
      this.$emit("bks-value-change", { value: formatted });
    },
  },

  mounted() {
    this.internalContextMenuItems = this.contextMenuItemsModifier;

    this.internalActionsKeymap = [{
      key: "Mod-F",
      run: () => {
        this.formatSql
      }
    }]
  },
});
</script>
