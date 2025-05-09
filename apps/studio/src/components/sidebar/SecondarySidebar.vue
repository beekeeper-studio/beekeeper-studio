<template>
  <div class="sidebar secondary-sidebar">
    <div class="sidebar-heading">
      <x-tabs>
        <x-tab
          v-for="tab in tabs"
          :key="tab.id"
          :selected="secondaryActiveTabId === tab.id"
          @click="handleTabClick(tab)"
        >
          <x-label>{{ tab.name }}</x-label>
        </x-tab>
      </x-tabs>
      <div class="actions">
        <button class="close-btn btn btn-flat btn-fab" @click="$emit('close')">
          <i class="material-icons">close</i>
        </button>
      </div>
    </div>
    <div class="sidebar-body" ref="body">
      <template v-for="tab in tabs">
        <json-viewer-sidebar
          v-if="tab.id === 'json-viewer' && secondaryActiveTabId === 'json-viewer'"
          :key="tab.id"
        />
        <sidebar-view
          v-else-if="secondaryActiveTabId === tab.id"
          :key="tab.id"
          :plugin-id="tab.id"
          :entry-url="tab.entry"
        />
      </template>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import { mapState, mapGetters, mapActions } from "vuex";
import JsonViewerSidebar from "./JsonViewerSidebar.vue";
import { AppEvent } from "@/common/AppEvent";
import SidebarView from "@/components/plugins/views/SidebarView.vue";

interface SidebarTab {
  id: string;
  label: string;
  defaultPosition: string;
}

export default Vue.extend({
  name: "SecondarySidebar",
  components: { JsonViewerSidebar, SidebarView },
  computed: {
    ...mapState("sidebar", ["secondaryActiveTabId", "secondarySidebarOpen"]),
    ...mapGetters("sidebar", ["tabs"]),
    rootBindings() {
      return [
        { event: AppEvent.selectSecondarySidebarTab, handler: this.setSecondaryActiveTabId },
      ];
    },
  },
  methods: {
    ...mapActions("sidebar", ["setSecondaryActiveTabId"]),
    handleTabClick(tab: SidebarTab) {
      this.setSecondaryActiveTabId(tab.id);
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
