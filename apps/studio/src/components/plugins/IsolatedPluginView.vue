<template>
  <div class="isolated-plugin-view">
    <div v-if="pluginManagerStatus !== 'ready'" class="alert">
      <template v-if="pluginManagerStatus === 'initializing'">
        Initializing plugins ...
      </template>
      <template v-else-if="pluginManagerStatus === 'failed-to-initialize'">
        Failed to initialize plugin manager.
      </template>
    </div>
    <div v-else-if="!snapshot" class="alert">
      <div class="alert-body">Plugin "{{ pluginId }}" is not installed.</div>
      <button class="btn btn-flat" @click="reloadComponent">Reload</button>
    </div>
    <div v-else-if="!snapshot.loadable" class="plugin-status">
      <p>
        Plugin "{{ snapshot.manifest.name }}" isn’t compatible with this version
        of Beekeeper Studio. It requires version
        {{ snapshot.manifest.minAppVersion }} or newer.
      </p>

      <p>To fix this:</p>

      <ol>
        <li>Upgrade your Beekeeper Studio.</li>
        <li>
          Or install an older plugin version manually (see
          <a
            href="https://docs.beekeeperstudio.io/user_guide/plugins/#installing-a-specific-plugin-version"
            >instructions</a
          >).
        </li>
      </ol>
    </div>
    <div v-else-if="error" class="alert alert-danger">
      <i class="material-icons-outlined">error</i>
      <div class="alert-body">{{ error }}</div>
      <button class="btn btn-flat" @click="reloadComponent">Reload</button>
    </div>
    <DisableStateAlert v-else :pluginId="pluginId" />
    <div class="iframe-container" ref="container" />
  </div>
</template>

<script lang="ts">
import Vue, { PropType } from "vue";
import { LoadViewParams } from "@beekeeperstudio/plugin";
import { ThemeChangedNotification } from "@beekeeperstudio/plugin";
import rawLog from "@bksLogger";
import { mapGetters, mapState } from "vuex";
import type { PluginSnapshot } from "@/services/plugin/types";
import DisableStateAlert from "./DisableStateAlert.vue";
import { AppEvent } from "@/common/AppEvent";

const log = rawLog.scope("IsolatedPluginView");

export default Vue.extend({
  name: "IsolatedPluginView",
  components: {
    DisableStateAlert,
  },
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
    onRequest: Function,
  },
  data() {
    return {
      loaded: false,
      unsubscribe: null,
      unsubscribeOnReady: null,
      unsubscribeOnDispose: null,
      iframe: null,
      error: null as string | null,
      mounting: false,
    };
  },
  computed: {
    ...mapState(["pluginManagerStatus"]),
    ...mapGetters("plugins/snapshots", ["snapshotsById"]),
    snapshot(): PluginSnapshot | undefined {
      return this.snapshotsById[this.pluginId];
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
    shouldMountIframe: {
      async handler() {
        await this.$nextTick();
        if (this.shouldMountIframe) {
          this.mountIframe().catch((e) => {
            log.error(e);
            this.error = e instanceof Error ? e.message : String(e);
          });
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
      iframe.src = this.$plugin.buildUrlFor(this.pluginId, this.viewId);
      iframe.sandbox = "allow-scripts allow-same-origin allow-forms";
      iframe.allow = "clipboard-read; clipboard-write;";
      iframe.style = "width: 100%; height: 100%;border: none;";

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
        this.error = e instanceof Error ? e.message : String(e);
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

.iframe-container {
  height: 100%;
  width: 100%;
}

.alert-actions {
  display: flex;
  gap: 0.5rem;
}
</style>
