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
      v-else-if="snapshot.disableState.reason === 'unlisted-theme-disabled'"
    >
      {{ snapshot.manifest.name }} is an unlisted theme. Unlisted themes are
      disabled via configuration. You can enable them in your ini config or at
      the top of the browse section.
    </div>
    <div
      class="alert-body"
      v-else-if="snapshot.disableState.reason === 'community-themes-disabled'"
    >
      {{ snapshot.manifest.name }} is a community theme. Community themes are
      disabled via configuration. You can enable them in your ini config or at
      the top of the browse section.
    </div>
    <div
      class="alert-body"
      v-else-if="snapshot.disableState.reason === 'missing-style'"
    >
      {{ snapshot.manifest.name }} is disabled because its stylesheet is
      missing.
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
import Vue, { PropType } from "vue";
import { PluginSnapshot, ThemeSnapshot } from "@/services/plugin";
import { mapGetters } from "vuex";
import globals from "@/common/globals";
import rawLog from "@bksLogger";

const log = rawLog.scope('DisableState')

export default Vue.extend({
  name: "DisableStateAlert",
  props: {
    id: {
      type: String,
      required: true,
    },
    type: {
      type: String as PropType<"plugin" | "theme">,
      required: true,
    },
  },
  computed: {
    ...mapGetters("plugins/snapshots", ["plugins"]),
    ...mapGetters("themes/snapshots", ["themes"]),
    snapshot(): PluginSnapshot | ThemeSnapshot | undefined {
      if (this.type === "plugin") {
        return this.plugins[this.id];
      }
      return this.themes[this.id];
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
