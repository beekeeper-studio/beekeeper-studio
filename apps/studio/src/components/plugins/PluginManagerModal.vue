<template>
  <base-modal
    :name="modalName"
    :loading="loadingPlugins"
    class="plugin-manager-modal"
    :first-focusable="null"
    min-width="800px"
    max-width="800px"
    height="800px"
  >
    <template #title>
      Plugins
    </template>
    <template>
      <div class="plugin-manager-content">
        <plugin-disabled-overlay v-if="$bksConfig.pluginSystem.disabled"/>
        <div class="card padding control-card">
          <control-row
            title="Install plugins"
            description="Browse and install plugins from the plugin registry."
          >
            <button
              class="btn btn-flat"
              @click="browseRemote"
            >
              Install
            </button>
          </control-row>
          <control-row
            title="Auto update"
            description="Allow plugins to be automatically updated on application launch."
          >
            <x-switch
              @click.prevent="autoUpdate = !autoUpdate"
              :toggled="autoUpdate"
            />
          </control-row>
        </div>
        <div class="plugin-list-container">
          <div class="header-row">
            <h3>
              Installed Plugins
            </h3>

            <div class="control">
              <a
                v-if="sortedInstalledPlugins?.length > 0"
                title="Check For Updates"
                @click="checkAllForUpdates"
              >
                <i class="material-icons">refresh</i>
              </a>
            </div>
          </div>
          <div class="alerts">
            <error-alert :error="errors" />
          </div>
          <plugin-list
            v-if="sortedInstalledPlugins?.length > 0"
            :plugins="sortedInstalledPlugins"
            @install="install"
            @uninstall="uninstall"
            @update="update"
            @item-click="openPluginPage"
            @checkForUpdates="checkForUpdates"
          />
          <div
            v-else
            class="alert alert-info"
          >
            No plugins are currently installed
          </div>
        </div>
        <slideover
          ref="install_slideover"
          :loading="loadingPlugins"
          flex-body
        >
          <template>
            <div class="card padding control-card">
              <control-row
                title="Official Plugins"
                description="Official Plugins are built and maintained by the Beekeeper Studio Team"
              >
                <x-switch
                  @click.prevent="officialEnabled = !officialEnabled"
                  :toggled="officialEnabled"
                />
              </control-row>
              <control-row
                title="Community Plugins"
                description="Community plugins are developed and maintined by independent third parties, not by Beekeeper Studio. Use at your own risk."
              >
                <x-switch
                  @click.prevent="communityEnabled = !communityEnabled"
                  :toggled="communityEnabled"
                />
              </control-row>
              <collapsible-section
                more-text="More Options"
              >
                <control-row
                  title="Custom Registries"
                  description="Enable custom registries to find plugins from. These can be configured in your ini file. (Coming Soon™)"
                >
                  <x-switch
                    :disabled="true"
                    @click.prevent="customEnabled = !customEnabled"
                    :toggled="false"
                  />
                </control-row>
                <control-row
                  title="Unlisted Plugins"
                  description="Enable unlisted plugins. These are anonymouse plugins not found in a registry, just placed in your plugin directory manually."
                >
                  <x-switch
                    @click.prevent="unlistedEnabled = !unlistedEnabled"
                    :toggled="unlistedEnabled"
                  />
                </control-row>
              </collapsible-section>
            </div>
            <plugin-list
              class="remote-plugin-list"
              :plugins="sortedPlugins"
              @install="install"
              @uninstall="uninstall"
              @update="update"
              @item-click="openPluginPage"
              @checkForUpdates="checkForUpdates"
            />
          </template>
        </slideover>
        <slideover
          ref="plugin_slideover"
          :loading="loadingPluginReadme"
        >
          <template>
            <plugin-page
              v-if="selectedPlugin"
              :plugin="selectedPlugin"
              :plugin-repo="selectedPluginRepo"
              :loading-markdown="loadingPluginReadme"
              @install="install(selectedPlugin)"
              @uninstall="uninstall(selectedPlugin)"
              @update="update(selectedPlugin)"
              @checkForUpdates="checkForUpdates(selectedPlugin)"
            />
          </template>
        </slideover>
      </div>
    </template>
  </base-modal>
</template>

<script lang="ts">
import Vue from "vue";
import { AppEvent } from "@/common/AppEvent";
import rawLog from "@bksLogger";
import PluginList from "./PluginList.vue";
import PluginPage from "./PluginPage.vue";
import _ from "lodash";
import ErrorAlert from "@/components/common/ErrorAlert.vue";
import Slideover from "@/components/common/Slideover.vue";
import BaseModal from "@/components/common/modals/BaseModal.vue";
import PluginDisabledOverlay from "./PluginDisabledOverlay.vue";
import ControlRow from "@/components/common/ControlRow.vue";
import CollapsibleSection from "@/components/common/CollapsibleSection.vue";
import { PluginSystemError } from "@/lib/errors";
import type { PluginSnapshot, Plugin, PluginRegistryEntry, PluginOrigin } from "@/services/plugin";
import { mapGetters, mapState } from "vuex";

const log = rawLog.scope("PluginManagerModal");

const ORIGIN_ORDER: Record<PluginOrigin, number> = {
  "official": 0,
  "community": 1,
  "custom": 2,
  "unlisted": 3,
  // This shouldn't happen, we exclude bundled from the list
  "bundled": Number.MAX_SAFE_INTEGER
};

const INSTALL_ORDER: Record<"true" | "false", number> = {
  "true": 0,
  "false": 10
}

export default Vue.extend({
  components: {
    PluginList,
    PluginPage,
    PluginDisabledOverlay,
    ErrorAlert,
    Slideover,
    BaseModal,
    ControlRow,
    CollapsibleSection
  },
  data() {
    return {
      modalName: "plugin-manager-modal",
      plugins: [],
      selectedPluginIdx: -1,
      selectedPluginReadme: "",
      selectedPluginRepo: null,
      loadingPluginReadme: false,
      loadedPlugins: false,
      errors: null,
      loadingPlugins: false,
      optionsAreExpanded: false
    };
  },
  async mounted() {
    if (this.$plugin.failedToInitialize) {
      this.$noty.error("Failed to initialize plugin manager.");
    }
    this.registerHandlers(this.rootBindings);
  },
  beforeDestroy() {
    this.unregisterHandlers(this.rootBindings);
  },
  computed: {
    ...mapState(["pluginManagerStatus"]),
    ...mapState("plugins/snapshots", {
      snapshots: "all",
    }),
    ...mapGetters("plugins/entries", {
      entries: "all",
    }),
    ...mapGetters("plugins/snapshots", ['snapshotsById']),
    rootBindings() {
      return [{ event: AppEvent.openPluginManager, handler: this.open }];
    },
    selectedPlugin() {
      return this.plugins[this.selectedPluginIdx];
    },
    sortedInstalledPlugins() {
      return _.sortBy(this.plugins.filter((p: Plugin) => p.installed), this.pluginSorter);
    },
    sortedPlugins() {
      return _.sortBy(this.plugins, this.pluginSorter);
    },
    autoUpdate: {
      get() {
        return this.$bksConfig.pluginSystem.autoUpdate;
      },
      async set(value) {
        await this.$util.send('config/writeUserValue', { path: 'pluginSystem.autoUpdate', value });
      }
    },
    communityEnabled: {
      get() {
        return !this.$bksConfig.pluginSystem.communityDisabled;
      },
      async set(value) {
        if (value) {
          // do we only want to do this the first time they enable?
          const title = `Enable Community Plugins?`;
          const confirmation = `By enabling community plugins, you acknowledge that you understand ` +
          `that Beekeeper Studio does not review, test, endorse, or warrant community plugins, ` +
          `and any use of them is at your own risk.`;
          if (!(await this.$confirm(title, confirmation, { confirmLabel: 'Enable', variant: "danger" }))) {
            return;
          }
        }

        await this.$util.send('config/writeUserValue', { path: 'pluginSystem.communityDisabled', value: !value });
      }
    },
    officialEnabled: {
      get() {
        return !this.$bksConfig.pluginSystem.officialEnabled;
      },
      async set(value) {
        await this.$util.send('config/writeUserValue', { path: 'pluginSystem.ultimateDisabled', value: !value });
      }
    },
    customEnabled: {
      get() {
        return !this.$bksConfig.pluginSystem.thirdPartyRegistriesDisabled;
      },
      async set(value) {
        await this.$util.send('config/writeUserValue', { path: 'pluginSystem.thirdPartyRegistriesDisabled', value: !value });
      }
    },
    unlistedEnabled: {
      get() {
        return !this.$bksConfig.pluginSystem.unlistedDisabled;
      },
      async set(value) {
        await this.$util.send('config/writeUserValue', { path: 'pluginSystem.unlistedDisabled', value: !value });
      }
    }
  },
  watch: {
    pluginManagerStatus: {
      async handler() {
        if (this.pluginManagerStatus === "failed-to-initialize") {
          this.errors = ["Plugin system was not initialized properly. Please restart Beekeeper Studio to continue using plugins or report this issue."]
        } else {
          this.errors = null
        }

        if (this.pluginManagerStatus === "ready") {
          await this.loadPlugins();
        } else if (this.pluginManagerStatus === "initializing") {
          this.loadingPlugins = true;
        } else {
          this.loadingPlugins = false;
        }
      },
      immediate: true,
    },
    communityEnabled: {
      async handler() {
        if (this.pluginManagerStatus === "ready") {
          this.plugins = [];
          await this.$store.dispatch("plugins/initialize");
          await this.loadPlugins();
        }
      }
    }
  },
  methods: {
    async loadPlugins() {
      this.loadingPlugins = true;

      try {
        this.plugins = await this.buildPluginListData();
      } catch (e) {
        log.error(e);
      }

      this.loadingPlugins = false;
    },
    async install({ id }) {
      const state = this.plugins.find((p) => p.id === id);

      try {
        state.installing = true;
        await this.$plugin.install(id);
        state.installed = true;
        // HACK(azmi): refresh the plugin list or just this item instead
        state.loadable = true;
      } catch (e) {
        log.error(e);
        state.error = e;
        this.$noty.error(`Failed to install plugin: ${e.message}`);
      } finally {
        state.installing = false;
      }
    },
    async update({ id }) {
      const state = this.plugins.find((p) => p.id === id);

      try {
        state.installing = true;
        const manifest = await this.$plugin.update(id);
        state.version = manifest.version;
        state.updateAvailable = false;
        // HACK(azmi): refresh the plugin list or just this item instead
        state.loadable = true;
      } catch (e) {
        log.error(e);
        state.error = e;
        this.$noty.error(`Failed to update plugin: ${e.message}`);
      } finally {
        state.installing = false;
      }
    },
    async checkAllForUpdates() {
      await Promise.all(this.sortedInstalledPlugins.map(async (plugin: Plugin) => {
        await this.checkForUpdates({ id: plugin.id });
      }));
    },
    async checkForUpdates({ id }) {
      const idx = this.plugins.findIndex((p) => p.id === id);

      try {
        this.$set(this.plugins, idx, {
          ...this.plugins[idx],
          checkingForUpdates: true,
        });
        this.$set(this.plugins, idx, {
          ...this.plugins[idx],
          updateAvailable: await this.$util.send("plugin/checkForUpdates", {
            id,
          }),
        });
      } catch (e) {
        log.error(e);
        this.$noty.error(`Failed to check for update: ${e.message}`);
      } finally {
        this.$set(this.plugins, idx, {
          ...this.plugins[idx],
          checkingForUpdates: false,
        });
      }
    },
    async uninstall({ id }) {
      if (!(await this.$confirm("Are you sure you want to uninstall?"))) {
        return;
      }

      const state = this.plugins.find((p) => p.id === id);

      try {
        await this.$plugin.uninstall(id);
        state.installed = false;
      } catch (e) {
        log.error(e);
        state.error = e;
        this.$noty.error(`Failed to uninstall plugin: ${e.message}`);
      }
    },
    async openPluginPage({ id }) {
      this.selectedPluginIdx = this.plugins.findIndex((p) => p.id === id);
      this.selectedPluginRepo = null;
      this.loadingPluginReadme = true;
      this.$refs.plugin_slideover.show();
      try {
        this.selectedPluginRepo = await this.$util.send("plugin/repository", { id });
      } catch (e) {
        log.error(e);

        if (e instanceof PluginSystemError && e.code === "PLUGIN_NOT_FOUND") {
          // FIXME use error alert box
          this.selectedPluginReadme = "We can't find the repository for this plugin.";
        } else {
          this.selectedPluginReadme = "Something went wrong.";
          this.$noty.error(`Error opening plugin page: ${e.message}`);
        }
      }
      this.loadingPluginReadme = false;
    },
    async buildPluginListData() {
      const entries: PluginRegistryEntry[] = this.entries;
      const installedPlugins: PluginSnapshot[] = this.snapshots;
      const list: Plugin[] = [];

      for (const { manifest, loadable, origin } of installedPlugins) {
        const data: Plugin = {
          ...manifest,
          installed: true,
          installing: false,
          checkingForUpdates: null,
          loadable,
          origin
        } as Plugin;

        if (data.origin === 'bundled') {
          continue;
        }

        const entry = entries.find((entry) => entry.id === manifest.id);

        // if the plugin is found in a registry
        if (entry) {
          data.repo = entry.repo;
          data.updateAvailable = await this.$util
            .send("plugin/checkForUpdates", { id: manifest.id })
            .catch((e) => {
              this.errors = [
                `Failed to check for updates for ${manifest.id}: ${e.message}`,
              ];
              console.error(e);
              return false;
            });
        }

        list.push(data);
      }

      for (const entry of entries) {
        if (!_.find(list, { id: entry.id })) {
          const data: Plugin = {
            ...entry,
            installed: false,
            installing: false,
            checkingForUpdates: null,
          } as Plugin;

          list.push(data);
        }
      }

      return list;
    },
    open() {
      this.$modal.show(this.modalName);
    },
    close() {
      this.$modal.hide(this.modalName);
    },
    browseRemote() {
      this.$refs.install_slideover.show();
    },
    pluginSorter(p: Plugin) {
      return ORIGIN_ORDER[p.origin] + INSTALL_ORDER[`${p.installed}`];
    }
  },
});
</script>

<style lang="scss" scoped>
@import '../../assets/styles/app/_variables';

$gutter-h: 1.5rem;

.alerts {
  margin-inline: 1.25rem;
}

.plugin-manager-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;
}

.remote-plugin-list {
  margin-top: 1rem;
}

.plugin-list-container {
  padding: 0.5rem 0 0;
  margin-top: 0.5rem;
  flex-grow: 1;
  flex-basis: 35%;
  min-height: 0;
  display: flex;
  flex-direction: column;

  >.description {
    padding-inline: $gutter-h;
    line-height: 1.5rem;
    margin-bottom: 0.5rem;
  }

  > .alerts,
  > .plugin-list-wrap > .fixed {
    padding-inline: $gutter-h;
  }
}

.plugin-manager-filter-container {
  margin-top: 1rem;
}

.control-card {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.header-row {
  display: flex;
  align-items: center;
  gap: 1.5rem;

  h3 {
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
  }

  a {
    padding: 0.5rem;
  }
}

.more-button {
  display: flex;
  align-items: center;
  gap: $gutter-h / 2;
  letter-spacing: normal;

  padding: 0;
  border: 0;
  background-color: transparent;
  font-size: 16px;
  color: $text-light;
  cursor: pointer;
  font-size: inherit;
  line-height: inherit;

  &:hover {
    color: $text-dark;
  }
}
</style>
