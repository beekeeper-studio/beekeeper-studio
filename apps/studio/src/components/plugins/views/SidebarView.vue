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
    reload: null,
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
      // FIXME move this somewhere
      return `plugin://${this.pluginId}/${this.entryUrl}?timestamp=${this.timestamp}`;
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
  watch: {
    reload() {
      this.timestamp = Date.now();
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
