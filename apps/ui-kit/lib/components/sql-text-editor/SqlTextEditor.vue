<template>
  <div class="BksUiKit BksTextEditor BksSqlTextEditor" ref="editor" />
</template>

<script lang="ts">
import mixin from "../text-editor/mixin";
import props from "./props";
import { SqlTextEditor } from "./SqlTextEditor";
import { Entity } from "../types";
import {
  ContextMenuExtension,
  InternalContextItem,
  divider,
} from "../context-menu";
import { format } from "sql-formatter";
import ProxyEmit from "../mixins/ProxyEmit";
import Vue from "vue";
import { TextEditorMenuContext } from "../text-editor";
import { SqlTextEditorMenuContext } from "./types";

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
    contextMenuItemsModifier(
      _event,
      items: InternalContextItem<unknown>[],
      context: TextEditorMenuContext
    ): ReturnType<ContextMenuExtension<SqlTextEditorMenuContext>> {
      const formatItem: InternalContextItem<unknown> = {
        label: `Format Query`,
        id: "text-format",
        handler: this.formatSql,
        shortcut: "Control+Shift+F",
      };

      if (this.allowPresets && this.presets?.length > 0) {
        const currentFormatterId = this.formatterConfig?.id;

        formatItem.items = [
          {
            label: "Format with current config",
            id: "format-default",
            handler: this.formatSql,
            shortcut: "Control+Shift+F"
          },
          divider,
          ...this.presets.map((preset) => ({
            label: `${preset.name}${preset.id === currentFormatterId ? ' *' : ''}`,
            id: `format-preset-${preset.id}`,
            handler: () => this.applyAndFormatPreset(preset),
          }))
        ];
      }
      
      const modifiedItems = [
        ...items,
        formatItem
      ];
      return {
        items: modifiedItems,
        context: {
          ...context,
          selectedQuery: this.selectedQuery,
        },
      };
    },
    applyAndFormatPreset(preset) {
      this.$emit("bks-apply-preset", { id: preset.id, ...preset.config });
    },
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
    this.contextMenuExtensions.push(this.contextMenuItemsModifier);
  },
});
</script>
