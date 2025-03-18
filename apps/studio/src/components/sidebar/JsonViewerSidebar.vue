<template>
  <json-viewer
    :value="value"
    :data-id="dataId"
    :hidden="hidden"
    :expandable-paths="expandablePaths"
    :reinitialize="reinitializeJsonViewer"
    @expandPath="handleExpandPath"
  />
</template>

<script lang="ts">
import Vue from "vue";
import JsonViewer from "./JsonViewer.vue";
import { AppEvent } from '@/common/AppEvent'

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
    update(options: { value: Record<string, unknown>; expandablePaths: string[] }) {
      this.value = options.value
      this.expandablePaths = options.expandablePaths
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
