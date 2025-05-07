<template>
  <div class="json-viewer-sidebar">
    <json-viewer
      :value="value"
      :filter="filter"
      :data-id="dataId"
      :hidden="hidden"
      :expandable-paths="expandablePaths"
      :reinitialize="reinitializeJsonViewer"
      :signs="signs"
      :binary-encoding="$bksConfig.ui.general.binaryEncoding"
      :editable-paths="editablePaths"
      @bks-json-value-change="handleJsonValueChange"
      @bks-filter-change="handleFilterChange"
      @expandPath="handleExpandPath"
    />
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import JsonViewer from "./JsonViewer.vue";
import { UpdateOptions } from "@/lib/data/jsonViewer";
import { AppEvent } from '@/common/AppEvent'
import { mapState } from 'vuex'
import { SmartLocalStorage } from '@/common/LocalStorage';

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
      dataId: -1,
      filter: "",
    };
  },

  computed: {
    ...mapState('tabs', { 'activeTab': 'active' }),
    jsonViewerTitle() {
      return "JSON Viewer";
    },
    reinitializeJsonViewer() {
      return 0;
    },
    rootBindings() {
      return [
        { event: AppEvent.updateJsonViewerSidebar, handler: this.update },
        { event: AppEvent.switchingTab, handler: this.handleSwitchingTab },
        { event: AppEvent.switchedTab, handler: this.handleSwitchedTab },
        { event: AppEvent.closingTab, handler: this.handleClosingTab },
      ]
    },

    isPersistable() {
      return !!this.activeTab
    },
    persistenceID() {
      return `jsonViewerSidebar-${this.activeTab?.id}`
    },
    persistentState() {
      return {
        filter: this.filter,
      }
    },
  },

  watch: {
    persistentState() {
      if (this.isPersistable) this.savePersistentState()
    },
  },

  methods: {
    handleExpandPath(expandablePaths: string[]) {
      this.trigger(AppEvent.jsonViewerSidebarExpandPath, expandablePaths)
    },
    handleJsonValueChange(detail: { key: string; value: unknown }) {
      this.trigger(AppEvent.jsonViewerSidebarValueChange, detail)
    },
    handleFilterChange(detail: { filter: string }) {
      this.filter = detail.filter
    },
    handleSwitchingTab() {
      this.reset()
    },
    handleSwitchedTab() {
      this.loadPersistentState()
    },
    handleClosingTab() {
      this.clearPersistentState()
    },

    update(options: UpdateOptions) {
      this.dataId = options.dataId
      this.value = options.value ?? ''
      this.expandablePaths = options.expandablePaths
      this.editablePaths = options.editablePaths
      this.signs = options.signs
    },
    reset() {
      this.dataId = -1
      this.value = {}
      this.expandablePaths = []
      this.editablePaths = []
      this.signs = {}
    },

    savePersistentState() {
      SmartLocalStorage.addItem(this.persistenceID, this.persistentState)
    },
    loadPersistentState() {
      const state = this.getPersistentState()
      this.filter = state.filter
    },
    getPersistentState() {
      const state = SmartLocalStorage.getJSON(this.persistenceID, {})
      return {
        filter: state.filter || "",
      }
    },
    clearPersistentState() {
      SmartLocalStorage.removeItem(this.persistenceID)
    },
  },
  mounted() {
    this.registerHandlers(this.rootBindings)
    this.loadPersistentState()
  },
  beforeDestroy() {
    this.unregisterHandlers(this.rootBindings)
  },
});
</script>
