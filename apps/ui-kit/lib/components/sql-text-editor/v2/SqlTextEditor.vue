<template>
  <div class="BksUiKit BksTextEditor BksSqlTextEditor" ref="editor"></div>
</template>

<script lang="ts">
import mixin from "../../text-editor/v2/mixin";
import props from "./props";
import { SqlTextEditor } from "./SqlTextEditor";
import { Entity } from "../../types";

export default {
  mixins: [mixin],

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
    constructTextEditor() {
      return new SqlTextEditor();
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
      this.textEditor.setRequestColumnsListener((entity: Entity) =>
        this.columnsGetter(entity.name)
      );
    },
  },
};
</script>
