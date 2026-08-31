<template>
  <component
    :is="component"
    class="BksMergeTextEditor"
    :value="currentVersion"
    :replace-extensions="extensions"
    read-only
    @bks-initialized="handleInitialized"
    v-bind="$attrs"
    v-on="$listeners"
  />
</template>

<script lang="ts">
import Vue from "vue";
import props from "./props";
import SurrealTextEditor from "../surreal-text-editor/SurrealTextEditor.vue";
import SqlTextEditor from "../sql-text-editor/SqlTextEditor.vue";
import TextEditor from "../text-editor/TextEditor.vue";
import { disableMerge, enableMerge, merge, MergeOptions, setOriginalText } from "./merge";
import { TextEditor as TextEditorClass } from "../text-editor/TextEditor";
import { Extension } from "@codemirror/state";

export default Vue.extend({
  props,

  components: { TextEditor, SurrealTextEditor, SqlTextEditor },

  computed: {
    component() {
      if (this.type === "surrealdb") {
        return SurrealTextEditor;
      }

      if (this.type === "sql") {
        return SqlTextEditor;
      }

      return TextEditor;
    },

    mergeOptions(): MergeOptions {
      return {
        originalText: this.previousVersion,
      };
    },
  },

  watch: {
    async previousVersion() {
      await this.$nextTick();
      if (!this.editor) {
        return;
      }
      setOriginalText(this.editor.view, this.previousVersion);
    },
    showDiff() {
      if (!this.editor) {
        return;
      }
      if (this.showDiff) {
        enableMerge(this.editor.view, this.mergeOptions);
      } else {
        disableMerge(this.editor.view);
      }
    },
  },

  methods: {
    extensions(extensions: Extension) {
      const extensionsWithMerge = [
        extensions,
        merge(this.mergeOptions),
      ]

      if (!this.replaceExtensions) {
        return extensionsWithMerge;
      }

      if (typeof this.replaceExtensions === "function") {
        return this.replaceExtensions(extensionsWithMerge);
      }

      return this.replaceExtensions;
    },
    handleInitialized(params: { editor: TextEditorClass }) {
      this.editor = params.editor;
    },
  },

  created() {
    this.editor = null;
  },
});
</script>
