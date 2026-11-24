<template>
  <base-modal
    :name="modalName"
    :loading="activeId === 'plugins' && loadingPlugins"
    first-focusable="input[name='theme-mode']:checked"
    min-width="50rem"
    max-width="50rem"
    height="46rem"
  >
    <config v-model="activeId">
      <config-page id="themes" title="Themes" icon="palette">
        <themes-config />
      </config-page>
      <config-page id="plugins" title="Plugins" icon="extension" fill-height>
        <plugins-config @loading="loadingPlugins = $event" />
      </config-page>
      <config-page id="cli" title="CLI" icon="settings_remote">
        <cli-config />
      </config-page>
    </config>
  </base-modal>
</template>

<script lang="ts">
import Vue from "vue";
import { AppEvent } from "@/common/AppEvent";
import BaseModal from "@/components/common/modals/BaseModal.vue";
import Config from "@/components/common/config/Config.vue";
import ConfigPage from "@/components/common/config/ConfigPage.vue";
import ThemesConfig from "./ThemesConfig.vue";
import PluginsConfig from "./PluginsConfig.vue";
import CliConfig from "./CliConfig.vue";

export default Vue.extend({
  components: {
    BaseModal,
    Config,
    ConfigPage,
    ThemesConfig,
    PluginsConfig,
    CliConfig,
  },
  data() {
    return {
      modalName: "config-modal",
      activeId: "themes",
      loadingPlugins: false,
    };
  },
  computed: {
    rootBindings() {
      return [
        { event: AppEvent.openAppearanceModal, handler: this.openAppearance },
        { event: AppEvent.openPluginManager, handler: this.openPlugins },
        { event: AppEvent.openCliConfig, handler: this.openCli },
      ];
    },
  },
  mounted() {
    if (this.$plugin.failedToInitialize) {
      this.$noty.error("Failed to initialize plugin manager.");
    }
    this.registerHandlers(this.rootBindings);
  },
  beforeDestroy() {
    this.unregisterHandlers(this.rootBindings);
  },
  methods: {
    openAppearance() {
      this.activeId = "themes";
      this.$modal.show(this.modalName);
    },
    openPlugins() {
      this.activeId = "plugins";
      this.$modal.show(this.modalName);
    },
    openCli() {
      this.activeId = "cli";
      this.$modal.show(this.modalName);
    },
  },
});
</script>

<style lang="scss" scoped>
.config ::v-deep {
  .config-content > :first-child {
    margin-top: 0;
  }

  hr {
    margin-inline: 0.5rem;
  }

  .form-group {
    padding: 0.5rem;
    border-radius: 6px;
  }
}
</style>
