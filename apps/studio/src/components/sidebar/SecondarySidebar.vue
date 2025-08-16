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
        <button class="close-btn btn btn-flat btn-fab" @click="$emit('close')">
          <i class="material-icons">close</i>
        </button>
      </div>
    </div>
    <div class="sidebar-body" ref="body">
      <template v-for="tab in tabs">
        <template v-if="tab.id === 'json-viewer'">
          <json-viewer-sidebar
            v-show="secondaryActiveTabId === 'json-viewer'"
            :key="tab.id"
          />
        </template>
        <template v-else-if="tab.id === 'value-editor'">
          <value-editor
            v-show="secondaryActiveTabId === 'value-editor'"
            :key="tab.id"
            :value-context="valueContext"
            @value-editor-change="handleValueEditorChange"
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
import ValueEditor from "./ValueEditor.vue";
import { AppEvent } from "@/common/AppEvent";
import IsolatedPluginView from "@/components/plugins/IsolatedPluginView.vue";
import { type ValueContext } from "@/lib/db/clients/BasicDatabaseClient";

interface SidebarTab {
  id: string;
  label: string;
  defaultPosition: string;
}

export default Vue.extend({
  name: "SecondarySidebar",
  components: { JsonViewerSidebar, ValueEditor, IsolatedPluginView },
  data() {
    return {
      reloaders: {},
      // Value Editor data (unified for both SQL and NoSQL)
      valueContext: null,
    };
  },
  computed: {
    ...mapState("sidebar", ["secondaryActiveTabId", "tabs", "secondarySidebarOpen"]),
    rootBindings() {
      return [
        {
          event: AppEvent.selectSecondarySidebarTab,
          handler: this.setSecondaryActiveTabId,
        },
        {
          event: AppEvent.updateValueEditor,
          handler: this.updateValueEditor,
        },
      ];
    },
  },
  methods: {
    ...mapActions("sidebar", ["setSecondaryActiveTabId"]),
    handleTabClick(event, tab: SidebarTab) {
      this.setSecondaryActiveTabId(tab.id);
    },
    updateValueEditor(data: { valueContext: ValueContext }) {
      // Update value editor with data from TableTable
      this.valueContext = data.valueContext;
    },
    handleValueEditorChange(changeData) {
      // Send back to TableTable to add to pending changes
      this.trigger(AppEvent.onValueEditorChange, changeData);
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
  beforeDestroy() {
    this.unregisterHandlers(this.rootBindings);
  },
});
</script>
