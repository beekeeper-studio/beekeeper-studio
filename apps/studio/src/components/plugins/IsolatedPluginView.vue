<template>
  <div class="isolated-plugin-view" ref="container" />
</template>

<script lang="ts">
import Vue, { PropType } from "vue";
import { LoadViewParams } from "@beekeeperstudio/plugin";
import { ThemeChangedNotification } from "@beekeeperstudio/plugin";
import { PluginSnapshot } from "@/services/plugin";

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
    params: null as PropType<LoadViewParams>,
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
      mounted: false,
      // Use a timestamp parameter to force iframe refresh
      timestamp: Date.now(),
      unsubscribe: null,
      unsubscribeOnReady: null,
      unsubscribeOnDispose: null,
      iframe: null,
    };
  },
  computed: {
    baseUrl() {
      // FIXME move this somewhere
      return `${this.url}?timestamp=${this.timestamp}`;
    },
    shouldMountIframe() {
      // If it's already mounted, do not unmount it unless it's not loaded
      if (this.mounted) {
        return this.loaded;
      }
      return this.visible && this.loaded;
    },
  },
  watch: {
    reload() {
      this.timestamp = Date.now();
    },
    shouldMountIframe: {
      async handler() {
        await this.$nextTick();
        if (this.shouldMountIframe) {
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

      // HACK(azmi): Trigger an initial `themeChanged` notification because
      // older versions of AI Shell don't automatically handle theme state on load.
      iframe.onload = () => {
        this.$plugin.notify(this.pluginId, {
          name: "themeChanged",
          args: this.$plugin.loaders
            .get(this.pluginId)
            .context.store.getTheme(),
        } as ThemeChangedNotification);
      };

      this.$plugin.registerIframe(
        this.pluginId,
        iframe,
        { command: this.command, params: this.params }
      );
      this.unsubscribe = this.$plugin.onViewRequest(this.pluginId, (args) => {
        if (args.source === iframe) {
          this.onRequest?.(args);
        }
      });
      this.$refs.container.appendChild(iframe);
      this.iframe = iframe;
      this.mounted = true;
    },
    unmountIframe() {
      if (!this.iframe) {
        return;
      }

      this.$plugin.unregisterIframe(this.pluginId, this.iframe);
      this.unsubscribe?.();
      this.iframe.remove();
      this.iframe = null;
      this.mounted = false;
    },
    handleError(e) {
      console.error(`${this.pluginId} iframe error`, e);
    }
  },
  mounted() {
    this.unsubscribeOnReady = this.$plugin.onReady(this.pluginId, () => {
      this.loaded = true;
    });
    this.unsubscribeOnDispose = this.$plugin.onDispose(this.pluginId, () => {
      this.loaded = false;
    })
  },
  beforeDestroy() {
    this.unsubscribeOnReady?.();
    this.unsubscribeOnDispose?.();
    this.unmountIframe();
  },
});
</script>
