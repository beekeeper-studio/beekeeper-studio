<template>
  <div class="sidebar-view">
    <iframe
      :src="iframeSrc"
      sandbox="allow-scripts allow-same-origin"
      ref="iframe"
    ></iframe>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import { PluginRequestData } from "@/services/plugin/types";

export default Vue.extend({
  name: "SidebarView",
  props: {
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
      // Use a timestamp parameter to force iframe refresh
      timestamp: Date.now(),
    };
  },
  computed: {
    baseUrl() {
      return `plugin://${this.pluginId}/${this.entryUrl}`;
    },
    iframeSrc() {
      // Append timestamp as query parameter to force refresh
      return `${this.baseUrl}?t=${this.timestamp}`;
    },
  },
  mounted() {
    // Add event listener for messages from iframe
    window.addEventListener("message", this.handleIframeMessage);
  },
  beforeDestroy() {
    // Clean up event listener
    window.removeEventListener("message", this.handleIframeMessage);
  },
  methods: {
    async handleIframeMessage(event: MessageEvent<PluginRequestData>) {
      // Get the iframe element
      const iframe = this.$refs.iframe;

      // Check if the message is from our iframe
      if (iframe && event.source === iframe.contentWindow) {
        const response = await this.$plugin.handleRequestFromSandbox(
          this.pluginId,
          event.data
        );
        iframe.contentWindow.postMessage(response, "*");
      }
    },
    refreshIframe() {
      this.timestamp = Date.now();
    },
  },
});
</script>
