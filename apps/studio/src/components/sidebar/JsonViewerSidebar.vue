<template>
  <div class="json-viewer-sidebar">
    <json-viewer
      :value="value"
      :data-id="dataId"
      :hidden="hidden"
      :expandable-paths="expandablePaths"
      :reinitialize="reinitializeJsonViewer"
      :signs="signs"
      :binary-encoding="$bksConfig.ui.general.binaryEncoding"
      :editable-paths="editablePaths"
      @bks-json-value-change="handleJsonValueChange"
      @expandPath="handleExpandPath"
    />
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import JsonViewer from "./JsonViewer.vue";
import { AppEvent } from '@/common/AppEvent'
import { LineGutter } from "@/lib/editor/utils";

export default Vue.extend({
  name: "JsonViewerSidebar",
  components: { JsonViewer },
  props: {
    hidden: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      value: {},
      expandablePaths: [],
      editablePaths: [],
      signs: {},
    };
  },
  computed: {
    jsonViewerTitle() {
      return "JSON Viewer";
    },
    dataId() {
      return -1;
    },
    reinitializeJsonViewer() {
      return 0;
    },
    rootBindings() {
      return [
        { event: AppEvent.updateJsonViewerSidebar, handler: this.update },
        { event: AppEvent.switchingTab, handler: this.handleSwitchingTab },
      ]
    },
  },
  methods: {
    handleExpandPath(expandablePaths: string[]) {
      this.trigger(AppEvent.jsonViewerSidebarExpandPath, expandablePaths)
    },
    handleJsonValueChange(detail: { key: string; value: unknown }) {
      this.trigger(AppEvent.jsonViewerSidebarValueChange, detail)
    },
    update(options: { value: Record<string, unknown>; expandablePaths: string[], signs: Record<string, LineGutter['type']>, editablePaths: string[] }) {
      this.value = options.value
      this.expandablePaths = options.expandablePaths
      this.signs = options.signs
    },
    handleSwitchingTab() {
      this.reset()
    },
    reset() {
      this.value = {}
      this.expandablePaths = []
    },
  },
  mounted() {
    this.registerHandlers(this.rootBindings)
  },
  beforeDestroy() {
    this.unregisterHandlers(this.rootBindings)
  },
});
</script>
