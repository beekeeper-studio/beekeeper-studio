<template>
  <div class="BksUiKit BksTextEditor BksSqlTextEditor" ref="editor"></div>
</template>

<script lang="ts">
import Vue from "vue";
import mixin from "../text-editor/mixin";
import props from "./props";
import ProxyEmit from "../mixins/ProxyEmit";
import { divider, InternalContextItem } from "../context-menu";
import { SurrealTextEditor } from "./SurrealTextEditor";
import { Entity } from "../types";

export default Vue.extend({
  mixins: [mixin, ProxyEmit],
  props,
  watch: {
    entities() {
      if (!this.textEditor) return;
      this.applyCompletionSource();
    },
  },
  methods: {
    constructTextEditor() {
      // return the surreal text editor
      return new SurrealTextEditor({
        columnsGetter: (entity: Entity) => {
          return this.columnsGetter?.(entity.name) || []
        }
      });
    },
    initialized() {
      this.applyCompletionSource();
    },
    applyCompletionSource() {
      this.textEditor.setCompletionSource({
        defaultSchema: null,
        entities: this.entities,
      });
    },
    contextMenuItemsModifier(_event, _target, items: InternalContextItem<unknown>[]): InternalContextItem<unknown>[] {
      const pivot = items.findIndex((o) => o.id === "find");

      const formatItem: InternalContextItem<unknown> = {
        label: `Format Query`,
        id: "text-format",
        handler: this.formatSql,
        shortcut: "Shift+F",
        disabled: true
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

        delete formatItem.handler;
        delete formatItem.shortcut;
      }

      return [
        ...items.slice(0, pivot),
        formatItem,
        divider,
        ...items.slice(pivot),
      ];
    },

    applyAndFormatPreset(preset) {
      this.$emit("bks-apply-preset", { id: preset.id, ...preset.config });
    },

    // Non text-editor overrides
    formatSql() {
      // figure out a way to format surql
      console.info("FORMAT");
    }
  },
  mounted() {
    this.internalContextMenuItems = this.contextMenuItemsModifier;
  }
})
</script>

<style>

</style>
