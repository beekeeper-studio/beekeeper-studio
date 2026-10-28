<template>
  <div v-if="snapshot?.disableState.disabled" class="alert">
    <i class="material-icons-outlined">info</i>
    <div
      class="alert-body"
      v-if="snapshot.disableState.reason === 'plugin-system-disabled'"
    >
      {{ snapshot.manifest.name }} is not available because the plugin system
      has been disabled.
    </div>
    <div
      class="alert-body"
      v-else-if="snapshot.disableState.reason === 'official-plugins-disabled'"
    >
      {{ snapshot.manifest.name }} is an official plugin. Official plugins are
      disabled via configuration. You can enable them in your ini config or at
      the top of the browse section.
    </div>
    <div
      class="alert-body"
      v-else-if="snapshot.disableState.reason === 'community-plugins-disabled'"
    >
      {{ snapshot.manifest.name }} is a community plugin. Community plugins are
      disabled via configuration. You can enable them in your ini config or at
      the top of the browse section.
    </div>
    <div
      class="alert-body"
      v-else-if="snapshot.disableState.reason === 'custom-registries-disabled'"
    >
      {{ snapshot.manifest.name }} is a custom plugin. Custom Registries are
      disabled via configuration. You can enable them in your ini config or at
      the top of the browse section.
    </div>
    <div
      class="alert-body"
      v-else-if="snapshot.disableState.reason === 'unlisted-disabled'"
    >
      {{ snapshot.manifest.name }} is an unlisted plugin. Unlisted plugins are
      disabled via configuration. You can enable them in your ini config or at
      the top of the browse section.
    </div>
    <div
      class="alert-body"
      v-else-if="snapshot.disableState.reason === 'disabled-by-config'"
    >
      {{ snapshot.manifest.name }} has been disabled via configuration.
    </div>
    <div
      class="alert-body"
      v-else-if="snapshot.disableState.reason === 'max-plugins-reached'"
    >
      {{ snapshot.manifest.name }} has been disabled as your license only allows
      {{ maxPlugins }}. Upgrade or uninstall the excess plugins.
    </div>
    <div class="alert-body" v-else>
      {{ snapshot.manifest.name }} is currently disabled.
    </div>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import { PluginSnapshot } from "@/services/plugin";
import { mapGetters } from "vuex";
import globals from "@/common/globals";
import rawLog from "@bksLogger";

const log = rawLog.scope('DisableState')

export default Vue.extend({
  name: "DisableStateAlert",
  props: {
    pluginId: {
      type: String,
      required: true,
    },
  },
  computed: {
    ...mapGetters("plugins/snapshots", ["snapshotsById"]),
    snapshot(): PluginSnapshot | undefined {
      return this.snapshotsById[this.pluginId];
    },
    maxPlugins() {
      return globals.plugins.maxCommunityPlugins;
    }
  },
  mounted() {
    log.info('disableState', this.snapshot.disableState)
  }
});
</script>

<style scoped></style>
