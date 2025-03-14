<template>
  <json-viewer
    :value="value"
    :data-id="dataId"
    :hidden="!openDetailView"
    :expandable-paths="expandablePaths"
    :reinitialize="reinitializeJsonViewer"
    @expandPath="handleExpandPath"
  />
</template>

<script lang="ts">
import Vue from "vue";
import { mapGetters, mapActions } from "vuex";
import JsonViewer from "./JsonViewer.vue";
import { AppEvent } from '@/common/AppEvent'

export default Vue.extend({
  name: "JsonViewerSidebar",
  components: { JsonViewer },
  data() {
    return {
      value: {},
      expandablePaths: [],
    };
  },
  computed: {
    ...mapGetters(["openDetailView"]),
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
        { event: AppEvent.jsonViewerSidebarUpdate, handler: this.update },
        { event: AppEvent.switchingTab, handler: this.handleSwitchingTab },
      ]
    },
  },
  methods: {
    ...mapActions(["toggleOpenDetailView"]),
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
