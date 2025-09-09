<template>
  <div class="isolated-plugin-view" ref="container">
    <div v-if="$bksConfig.plugins?.[pluginId]?.disabled" class="alert">
      <i class="material-icons-outlined">info</i>
      <div>This plugin ({{ pluginId }}) has been disabled via configuration</div>
    </div>
  </div>
</template>

<script lang="ts">
import Vue, { PropType } from "vue";
import { JsonValue } from "@/types";

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
    command: String,
    args: null as PropType<JsonValue>,
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
      iframe: null,
    };
  },
  computed: {
    baseUrl() {
      // FIXME move this somewhere
      return `${this.url}?timestamp=${this.timestamp}`;
    },
    showIframe() {
      return this.visible || this.loaded;
    },
  },
  watch: {
    reload() {
      this.timestamp = Date.now();
    },
    showIframe: {
      async handler() {
        await this.$nextTick();
        if (this.showIframe) {
          this.mountIframe();
        } else {
          this.unmountIframe();
        }
      },
      immediate: true,
    },
  },
  methods: {
    mountIframe() {
      if (this.iframe) {
        return;
      }

      const iframe = document.createElement("iframe");
      iframe.src = this.baseUrl;
      iframe.sandbox = "allow-scripts allow-same-origin allow-forms";
      iframe.allow = "clipboard-read; clipboard-write;";

      this.$plugin.registerIframe(
        this.pluginId,
        iframe,
        { command: this.command, args: this.args }
      );
      this.unsubscribe = this.$plugin.onViewRequest(this.pluginId, (args) => {
        if (args.source === iframe) {
          this.onRequest?.(args);
        }
      });
      this.$refs.container.appendChild(iframe);
      this.iframe = iframe;
      this.loaded = true;
    },
    unmountIframe() {
      if (!this.iframe) {
        return;
      }

      this.$plugin.unregisterIframe(this.pluginId, this.iframe);
      this.unsubscribe?.();
      this.iframe.remove();
      this.iframe = null;
      this.loaded = false;
    },
    handleError(e) {
      console.error(`${this.pluginId} iframe error`, e);
    }
  },
  beforeDestroy() {
    this.unmountIframe();
  },
});
</script>
