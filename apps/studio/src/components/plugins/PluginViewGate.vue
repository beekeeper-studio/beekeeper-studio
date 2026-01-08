<!--
This component is responsible for communicating plugin initialization states
(error, loading, disabled, compatibility). The default slot is rendered only
when the plugin is ready.

Example:

<PluginViewGate plugin-id="bks-ai-shell" view-id="main-view" v-slot="slotProps">
  <IsolatedPluginView :plugin="slotProps.snapshot" :url="slotProps.url" />
</PluginViewGate>
-->

<template>
  <div
    class="plugin-view-gate"
    :class="`status-${data.status}`"
  >
    <div v-if="data.status === 'initializing-plugin-manager'" class="gate-fallback">
      <x-progressbar />
      <div class="gate-fallback-content">
        Initializing plugins ...
      </div>
    </div>
    <div v-else-if="data.status === 'failed-to-initialize-plugin-manager'" class="gate-fallback">
      <div class="gate-fallback-content">
        <div class="alert alert-danger">
          <i class="material-icons">error_outlined</i>
          <div class="alert-body">
            <p>
              The plugin manager failed to initialize. Try restarting the app
              to continue using this plugin. If this persists, please report it
              on our <a href="https://github.com/beekeeper-studio/beekeeper-studio/issues/new/choose">issue tracker</a>.
            </p>
          </div>
        </div>
      </div>
    </div>
    <div v-else-if="data.status === 'error'" class="gate-fallback">
      <div class="gate-fallback-content">
        <div class="alert alert-danger">
          <i class="material-icons">error_outlined</i>
          <div class="alert-body">
            {{ data.message }}
          </div>
        </div>
      </div>
    </div>
    <div v-else-if="data.snapshot.disabled" class="gate-fallback">
      <div class="gate-fallback-content">
        <DisabledPluginAlert
          v-for="reason in data.snapshot.disableReasons"
          :reason="reason"
          :plugin-name="data.snapshot.manifest.name"
        />
      </div>
    </div>
    <div v-else-if="!data.snapshot.compatible" class="gate-fallback not-compatible">
      <div class="gate-fallback-content">
        <div class="alert">
          <i class="material-icons">info_outlined</i>
          <div class="alert-body">
            <p>
              Plugin "{{ data.snapshot.manifest.name }}" isn’t compatible with this version of Beekeeper Studio.
              It requires version {{ data.snapshot.manifest.minAppVersion }} or newer.
            </p>
            <p>To fix this:</p>
            <ol>
              <li>Upgrade your Beekeeper Studio.</li>
              <li>Or install an older plugin version manually (see <a href="https://docs.beekeeperstudio.io/user_guide/plugins/#installing-a-specific-plugin-version">instructions</a>).</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
    <slot v-else :data="data" />
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import { mapState } from "vuex";
import { PluginSnapshot, WebPluginManagerStatus } from "@/services/plugin/types";
import DisabledPluginAlert from "./DisabledPluginAlert.vue";

export default Vue.extend({
  props: {
    pluginId: {
      type: String,
      required: true,
    },
    viewId: {
      type: String,
      required: true,
    },
  },
  components: {
    DisabledPluginAlert,
  },
  computed: {
    ...mapState(["pluginManagerStatus", "pluginSnapshots"]),
    data() {
      const pluginManagerStatus: WebPluginManagerStatus = this.pluginManagerStatus;
      if (pluginManagerStatus === "initializing") {
        return {
          status: "initializing-plugin-manager" as const,
        };
      }
      if (pluginManagerStatus === "failed-to-initialize") {
        return {
          status: "failed-to-initialize-plugin-manager" as const,
        };
      }

      // At this point, plugin manager is ready.

      const snapshot: PluginSnapshot = this.pluginSnapshots.find((p) => p.manifest.id === this.pluginId);
      if (!snapshot) {
        return {
          status: "error" as const,
          message: `Plugin "${this.pluginId}" was not found. It may have been uninstalled or failed to load.`,
        };
      }

      const view = snapshot.manifest.capabilities.views.find((v) => v.id === this.viewId);
      if (!view) {
        return {
          status: "error" as const,
          message: `Plugin view "${this.viewId}" was not found in the ${snapshot.manifest.name} plugin.`
        };
      }

      const url: string = this.$plugin.buildUrlFor(this.pluginId, view.entry);
      return {
        status: "ready" as const,
        url,
        snapshot,
      };
    },
  },
});
</script>

<style scoped>
.plugin-view-gate {
  height: 100%;
}

.gate-fallback {
  &::v-deep .upsell-buttons .actions {
    gap: 1rem;
  }

  &.not-compatible .alert-body {
    display: block;
  }
}

.gate-fallback-content {
  margin: 1rem;
}

x-progressbar {
  margin-bottom: 1rem;
}

.alert  {
  a {
    display: inline;
  }

  .material-icons {
    margin: 0;
  }
}
</style>
