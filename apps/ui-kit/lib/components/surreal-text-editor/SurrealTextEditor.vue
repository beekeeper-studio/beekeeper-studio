<template>
  <div class="BksUiKit BksTextEditor BksSqlTextEditor" ref="editor"></div>
</template>

<script lang="ts">
import Vue from "vue";
import mixin from "../text-editor/mixin";
import props from "./props";
import ProxyEmit from "../mixins/ProxyEmit";
import { ContextMenuExtension, divider, InternalContextItem } from "../context-menu";
import { SurrealTextEditor } from "./SurrealTextEditor";
import { Entity } from "../types";
import { SurrealTextEditorMenuContext } from "./types";
import { TextEditorMenuContext } from "../text-editor";

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
    contextMenuItemsModifier(
      _event,
      items: InternalContextItem<unknown>[],
      context: TextEditorMenuContext
    ): ReturnType<ContextMenuExtension<SurrealTextEditorMenuContext>> {
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
            id: "format-default"
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
        ...items.slice(0, pivot),
        formatItem,
        divider,
        ...items.slice(pivot),
      ];
      return {
        items: modifiedItems,
        context,
      }
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
    this.contextMenuExtensions.push(this.contextMenuItemsModifier);
  }
})
</script>

<style>

</style>
