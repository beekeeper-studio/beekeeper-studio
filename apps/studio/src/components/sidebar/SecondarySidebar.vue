<template>
  <div class="sidebar secondary-sidebar">
    <div class="sidebar-heading">
      <x-tabs>
        <x-tab
          v-for="tab in tabs"
          :key="tab.id"
          :selected="selectedTabId === tab.id"
          @click="handleTabClick(tab)"
        >
          <x-label>{{ tab.label }}</x-label>
        </x-tab>
      </x-tabs>
      <div class="actions">
        <button
          class="close-btn btn btn-flat btn-fab"
          @click="toggleOpenDetailView(false)"
        >
          <i class="material-icons">close</i>
        </button>
      </div>
    </div>
    <div class="sidebar-body" ref="body">
      <json-viewer-sidebar v-if="selectedTabId === 'json-viewer'" />
    </div>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import { mapGetters, mapActions } from "vuex";
import JsonViewerSidebar from "./JsonViewerSidebar.vue";

interface SidebarTab {
  id: string;
  label: string;
  defaultPosition: string;
}

export default Vue.extend({
  name: "SecondarySidebar",
  components: { JsonViewerSidebar },
  data() {
    return {
      selectedTabId: "json-viewer",
    };
  },
  computed: {
    ...mapGetters(["openDetailView"]),
    tabs() {
      return [
        {
          id: "json-viewer",
          label: "JSON Viewer",
          // defaultPosition: "secondary", // TODO(azmi): We might want to support primary position
        },
      ];
    }
  },
  methods: {
    ...mapActions(["toggleOpenDetailView"]),
    handleTabClick(tab: SidebarTab) {
      this.selectedTabId = tab.id;
    },
  },
});
</script>
