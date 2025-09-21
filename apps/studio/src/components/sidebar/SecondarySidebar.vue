<template>
  <div class="sidebar secondary-sidebar">
    <div class="sidebar-heading">
      <x-tabs>
        <x-tab
          v-for="tab in tabs"
          :key="tab.id"
          :selected="secondaryActiveTabId === tab.id"
          @click="handleTabClick($event, tab)"
          @click.right="handleTabRightClick($event, tab)"
        >
          <x-label>{{ tab.label }}</x-label>
        </x-tab>
      </x-tabs>
      <div class="actions">
        <!-- Menu button for JSON Viewer (only show when json-viewer tab is active) -->
        <x-button
          v-if="secondaryActiveTabId === 'json-viewer'"
          class="menu-btn btn btn-fab"
          tabindex="0"
        >
          <i class="material-icons">more_vert</i>
          <x-menu style="--target-align:right;">
            <x-menuitem
              v-for="option in jsonViewerMenuOptions"
              :key="option.name"
              :toggled="option.checked"
              :togglable="typeof option.checked !== 'undefined'"
              @click.prevent="option.handler"
            >
              <x-label>{{ option.name }}</x-label>
            </x-menuitem>
            <x-menuitem v-if="jsonViewerMenuOptions.length === 0">
              <x-label>No options available</x-label>
            </x-menuitem>
          </x-menu>
        </x-button>
        <button class="close-btn btn btn-flat btn-fab" @click="$emit('close')">
          <i class="material-icons">close</i>
        </button>
      </div>
    </div>
    <div class="sidebar-body" ref="body">
      <template v-for="tab in tabs">
        <template v-if="tab.id === 'json-viewer'">
          <json-viewer-sidebar
            ref="jsonViewerSidebar"
            v-show="secondaryActiveTabId === 'json-viewer'"
            :key="tab.id"
          />
        </template>
        <isolated-plugin-view
          v-else
          :visible="secondaryActiveTabId === tab.id"
          :key="tab.id"
          :plugin-id="tab.id"
          :url="tab.url"
          :reload="reloaders[tab.id]"
        />
      </template>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import { mapState, mapActions } from "vuex";
import JsonViewerSidebar from "./JsonViewerSidebar.vue";
import { AppEvent } from "@/common/AppEvent";
import IsolatedPluginView from "@/components/plugins/IsolatedPluginView.vue";

interface SidebarTab {
  id: string;
  label: string;
  defaultPosition: string;
}

export default Vue.extend({
  name: "SecondarySidebar",
  components: { JsonViewerSidebar, IsolatedPluginView },
  data() {
    return {
      reloaders: {},
    };
  },
  computed: {
    ...mapState("sidebar", ["secondaryActiveTabId", "tabs", "secondarySidebarOpen"]),
    jsonViewerMenuOptions() {
      if (this.secondaryActiveTabId === 'json-viewer') {
        // Return hardcoded menu options for now to test the UI
        return [
          {
            name: "Copy Visible",
            handler: () => {
              const jsonViewerSidebar = this.$refs.jsonViewerSidebar as any;
              const jsonViewer = jsonViewerSidebar?.$refs?.jsonViewer;
              if (jsonViewer?.text) {
                this.$native.clipboard.writeText(jsonViewer.text);
              }
            },
          },
          {
            name: "Collapse all",
            handler: () => {
              const jsonViewerSidebar = this.$refs.jsonViewerSidebar as any;
              const jsonViewer = jsonViewerSidebar?.$refs?.jsonViewer;
              if (jsonViewer) {
                jsonViewer.foldAll++;
              }
            },
          },
          {
            name: "Expand all",
            handler: () => {
              const jsonViewerSidebar = this.$refs.jsonViewerSidebar as any;
              const jsonViewer = jsonViewerSidebar?.$refs?.jsonViewer;
              if (jsonViewer) {
                jsonViewer.unfoldAll++;
              }
            },
          },
          {
            name: "Wrap Text",
            handler: () => {
              const jsonViewerSidebar = this.$refs.jsonViewerSidebar as any;
              const jsonViewer = jsonViewerSidebar?.$refs?.jsonViewer;
              if (jsonViewer) {
                jsonViewer.wrapText = !jsonViewer.wrapText;
              }
            },
            checked: false, // We could make this dynamic later
          },
        ];
      }
      return [];
    },
    rootBindings() {
      return [
        {
          event: AppEvent.selectSecondarySidebarTab,
          handler: this.setSecondaryActiveTabId,
        },
      ];
    },
  },
  methods: {
    ...mapActions("sidebar", ["setSecondaryActiveTabId"]),
    handleTabClick(event, tab: SidebarTab) {
      this.setSecondaryActiveTabId(tab.id);
    },
    handleTabRightClick(event, tab: SidebarTab) {
      if (!window.platformInfo.isDevelopment) {
        return
      }

      this.$bks.openMenu({
        event,
        options: [
          {
            name: "[DEV] Reload View",
            handler: () => {
              this.$set(this.reloaders, tab.id, Date.now());
            },
          },
        ],
      });
    },
  },
  mounted() {
    this.registerHandlers(this.rootBindings);
  },
  updated() {
    // No longer needed - removed updateMenuOptions
  },
  beforeDestroy() {
    this.unregisterHandlers(this.rootBindings);
  },
});
</script>
