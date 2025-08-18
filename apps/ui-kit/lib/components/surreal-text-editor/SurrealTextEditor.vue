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
      return new SurrealTextEditor();
    },
    initialized() {
      this.applyCompletionSource();
      this.applyRequestColumnsListener();
    },
    applyCompletionSource() {
      this.textEditor.setCompletionSource({
        defaultSchema: null,
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
      const pivot = items.findIndex((o) => o.id === "find");
      return [
        ...items.slice(0, pivot),
        {
          label: `Format Query`,
          id: "text-format",
          handler: this.formatSql,
          shortcut: "Shift+F",
          disabled: true
        },
        divider,
        ...items.slice(pivot),
      ];
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
