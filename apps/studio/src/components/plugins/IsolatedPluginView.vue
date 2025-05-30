<template>
  <div class="isolated-plugin-view">
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
    },
    handleError(e) {
      console.error(`${this.pluginId} iframe error`, e);
    }
  },
  beforeDestroy() {
    this.$plugin.unregisterIframe(this.pluginId, this.$refs.iframe);
  },
});
</script>
