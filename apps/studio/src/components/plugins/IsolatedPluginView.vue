<template>
  <div class="isolated-plugin-view">
    <div v-if="$bksConfig.plugins?.[pluginId]?.disabled" class="alert">
      <i class="material-icons-outlined">info</i>
      <div>This plugin ({{ pluginId }}) has been disabled via configuration</div>
    </div>
    <iframe
      v-else-if="visible || loaded"
      :src="baseUrl"
      sandbox="allow-scripts allow-same-origin allow-forms"
      allow="clipboard-read; clipboard-write;"
      ref="iframe"
      @load="handleIframeLoad"
      @error="handleError"
    ></iframe>
  </div>
</template>

<script lang="ts">
import Vue from "vue";

export default Vue.extend({
  name: "IsolatedPluginView",
  props: {
    visible: {
      type: Boolean,
      default: true,
    },
    pluginId: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    onRequest: Function,
    reload: null,
  },
  data() {
    return {
      loaded: false,
      // Use a timestamp parameter to force iframe refresh
      timestamp: Date.now(),
      unsubscribe: null,
    };
  },
  computed: {
    baseUrl() {
      // FIXME move this somewhere
      return `${this.url}?timestamp=${this.timestamp}`;
    },
  },
  watch: {
    reload() {
      this.timestamp = Date.now();
    },
  },
  methods: {
    handleIframeLoad() {
      this.loaded = true;
      this.$plugin.registerIframe(this.pluginId, this.$refs.iframe);
      this.unsubscribe = this.$plugin.onViewRequest(this.pluginId, (args) => {
        if (args.source === this.$refs.iframe) {
          this.onRequest?.(args);
        }
      });
    },
    handleError(e) {
      console.error(`${this.pluginId} iframe error`, e);
    }
  },
  beforeDestroy() {
    this.$plugin.unregisterIframe(this.pluginId, this.$refs.iframe);
    this.unsubscribe?.();
  },
});
</script>
