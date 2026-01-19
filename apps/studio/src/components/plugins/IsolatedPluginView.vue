<template>
  <div class="isolated-plugin-view" ref="container">
    <div v-if="error" class="alert alert-danger">
      <i class="material-icons-outlined">error</i>
      <div class="alert-body">{{ error }}</div>
      <button class="btn btn-flat" @click="reloadComponent">Reload</button>
    </div>
    <div v-if="$bksConfig.plugins?.[pluginId]?.disabled" class="alert">
      <i class="material-icons-outlined">info</i>
      <div>This plugin ({{ pluginId }}) has been disabled via configuration</div>
    </div>
  </div>
</template>

<script lang="ts">
import Vue, { PropType } from "vue";
import { LoadViewParams } from "@beekeeperstudio/plugin";
import { ThemeChangedNotification } from "@beekeeperstudio/plugin";
import rawLog from "@bksLogger";

const log = rawLog.scope("IsolatedPluginView");

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
    viewId: {
      type: String,
      required: true,
    },
    command: String,
    params: null as PropType<LoadViewParams>,
    // @todo move url creation to this component by using pluginId and viewId
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
      unsubscribeOnReady: null,
      unsubscribeOnDispose: null,
      iframe: null,
      error: null as string | null,
      mounting: false,
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
    mounted() {
      return !!this.iframe;
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
    async mountIframe() {
      if (this.iframe || this.mounting) {
        return;
      }

      this.mounting = true;
      this.error = null;

      try {
        const exists = await this.$plugin.viewEntrypointExists(
          this.pluginId,
          this.viewId
        );
        if (!exists) {
          this.error = "Plugin view entrypoint does not exist";
          return;
        }
      } catch (e) {
        this.error =
          `${e.message} - The plugin may not be installed, or it tried to ` +
          "load a view that doesn't exist."
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
      this.mounting = false;
    },
    unmountIframe() {
      if (!this.iframe) {
        return;
      }

      this.$plugin.unregisterIframe(this.pluginId, this.iframe);
      this.unsubscribe?.();
      this.iframe.remove();
      this.iframe = null;
    },
    initialize() {
      this.unsubscribeOnReady = this.$plugin.onReady(this.pluginId, () => {
        this.loaded = true;
      });
      this.unsubscribeOnDispose = this.$plugin.onDispose(this.pluginId, () => {
        this.loaded = false;
      })
    },
    cleanup() {
      this.unsubscribeOnReady?.();
      this.unsubscribeOnDispose?.();
      this.loaded = false;
    },
    async reloadComponent() {
      try {
        this.cleanup();
        this.unmountIframe();
        this.initialize();
        await this.mountIframe();
      } catch (e) {
        log.error(e);
        this.error = e.message;
      }
    },
  },
  mounted() {
    try {
      this.initialize();
    } catch (e) {
      log.error(e);
      this.error = e.message;
    }
  },
  beforeDestroy() {
    this.cleanup();
    this.unmountIframe();
  },
});
</script>

<style scoped>
.isolated-plugin-view .alert {
  margin: 1rem;
}
</style>
