<template>
  <div class="sidebar secondary-sidebar">
    <div class="sidebar-heading">
      <x-tabs>
        <x-tab
          v-for="tab in tabs"
          :key="tab.id"
          :selected="activeTabId === tab.id"
          @click="handleTabClick(tab)"
        >
          <x-label>{{ tab.label }}</x-label>
        </x-tab>
      </x-tabs>
      <div class="actions">
        <button class="close-btn btn btn-flat btn-fab" @click="$emit('close')">
          <i class="material-icons">close</i>
        </button>
      </div>
    </div>
    <div class="sidebar-body" ref="body">
      <json-viewer-sidebar v-if="activeTabId === 'json-viewer'" />
    </div>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import { mapState, mapActions } from "vuex";
import JsonViewerSidebar from "./JsonViewerSidebar.vue";
import { AppEvent } from "@/common/AppEvent";

interface SidebarTab {
  id: string;
  label: string;
  defaultPosition: string;
}

export default Vue.extend({
  name: "SecondarySidebar",
  components: { JsonViewerSidebar },
  computed: {
    ...mapState("secondarySidebar", ["activeTabId", "tabs", "open"]),
    rootBindings() {
      return [
        { event: AppEvent.selectSecondarySidebarTab, handler: this.setActiveTab },
      ];
    },
  },
  methods: {
    ...mapActions("secondarySidebar", ["setActiveTab"]),
    handleTabClick(tab: SidebarTab) {
      this.setActiveTab(tab.id);
    },
  },
  mounted() {
    this.registerHandlers(this.rootBindings);
  },
  beforeDestroy() {
    this.unregisterHandlers(this.rootBindings);
  },
});
</script>
