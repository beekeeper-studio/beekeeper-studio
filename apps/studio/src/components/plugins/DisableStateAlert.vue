<template>
  <div v-if="snapshot?.disableState.disabled" class="alert">
    <i class="material-icons-outlined">info</i>
    <div
      class="alert-body"
      v-if="snapshot.disableState.reason === 'plugin-system-disabled'"
    >
      <template v-if="$bksConfig.pluginSystem.allow.length === 0">
        {{ snapshot.manifest.name }} is not available because the plugin system
        has been disabled.
      </template>
      <template v-else>
        The plugin system is disabled. {{ snapshot.manifest.name }} is not
        included in the list of allowed plugins.
      </template>
    </div>
    <div
      class="alert-body"
      v-else-if="snapshot.disableState.reason === 'community-plugins-disabled'"
    >
      {{ snapshot.manifest.name }} is a community plugin. Community plugins are
      disabled via configuration.
    </div>
    <div
      class="alert-body"
      v-else-if="snapshot.disableState.reason === 'disabled-by-config'"
    >
      {{ snapshot.manifest.name }} has been disabled via configuration.
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
  },
});
</script>

<style scoped></style>
