<template>
  <div class="sidebar-view">
    <iframe
      v-if="visible || loaded"
      :src="baseUrl"
      sandbox="allow-scripts allow-same-origin allow-forms"
      ref="iframe"
      @load="handleIframeLoad"
      @error="handleError"
    ></iframe>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import { PluginNotificationData } from "@/services/plugin/types";
import { AppEvent } from "@/common/AppEvent";

export default Vue.extend({
  name: "SidebarView",
  props: {
    visible: {
      type: Boolean,
      default: true,
    },
    pluginId: {
      type: String,
      required: true,
    },
    entryUrl: {
      type: String,
      required: true,
    },
  },
  data() {
    return {
      loaded: false,
      // Use a timestamp parameter to force iframe refresh
      timestamp: Date.now(),
    };
  },
  computed: {
    baseUrl() {
      return `plugin://${this.pluginId}/${this.entryUrl}`;
    },
    rootBindings() {
      return [
        {
          event: AppEvent.settingsChanged,
          handler: this.handleSettingsChanged,
        },
      ];
    },
  },
  mounted() {
    this.registerHandlers(this.rootBindings);
  },
  beforeDestroy() {
    this.unregisterHandlers(this.rootBindings);
  },
  methods: {
    handleSettingsChanged(key) {
      if (key === "theme") {
        const data: PluginNotificationData = { name: "themeChanged" }
        this.$plugin.notify(this.pluginId, data);
      }
    },
    refreshIframe() {
      this.timestamp = Date.now();
    },
    handleIframeLoad() {
      this.loaded = true;
      this.$plugin.registerIframe(this.pluginId, this.$refs.iframe);
    },
    handleError(e) {
      console.error(`${this.pluginId} iframe error`, e);
    }
  },
});
</script>
