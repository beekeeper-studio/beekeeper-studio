<template>
  <div class="config-page-content">
    <div class="plugin-manager-content">
      <plugin-disabled-overlay v-if="$bksConfig.pluginSystem.disabled" />
      <plugin-list
        class="installed-plugin-list"
        :plugins="sortedInstalledPlugins"
        @install="install"
        @uninstall="uninstall"
        @update="update"
        @item-click="openPluginPage"
        @checkForUpdates="checkForUpdates"
      >
        <template #header>
          <div class="config-group">
            <control-row
              title="Install Plugins"
              description="Browse and install plugins from the plugin registry."
            >
              <button
                type="button"
                class="btn btn-flat"
                @click="config.open('plugin-browse')"
              >
                Browse…
              </button>
            </control-row>
            <control-row
              title="Plugin Configuration"
              description="Registries, updates and GitHub rate limits."
            >
              <button
                type="button"
                class="btn btn-flat"
                @click="config.open('plugin-config')"
              >
                Configure…
              </button>
            </control-row>
            <div class="alerts">
              <error-alert :error="errors" />
            </div>
          </div>
        </template>
        <template #sticky-header>
          <h3>Installed Plugins</h3>
          <button
            v-if="sortedInstalledPlugins.length > 0"
            type="button"
            class="btn btn-icon"
            title="Check For Updates"
            @click="checkAllForUpdates"
          >
            <i class="material-icons">refresh</i>
          </button>
        </template>
      </plugin-list>
    </div>
    <config-page
      id="plugin-browse"
      title="Browse Plugins"
      :loading="loadingPlugins"
    >
      <template>
        <div
          v-if="!optInAlertDismissed"
          class="alert alert-info"
        >
          <i class="material-icons-outlined">info</i>
          <div class="alert-body expand">
            Official and community plugins are off by default. Turn them
            on in Plugin Configuration to see more plugins.
          </div>
          <button
            type="button"
            class="btn btn-flat"
            @click="highlightOptIn = true; config.open('plugin-config')"
          >
            Configure…
          </button>
          <button
            type="button"
            class="btn btn-icon"
            title="Dismiss"
            @click="dismissOptInAlert"
          >
            <i class="material-icons">close</i>
          </button>
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
    </config-page>
    <config-page
      id="plugin-detail"
      :title="selectedPlugin ? selectedPlugin.name : ''"
      :loading="loadingPluginReadme"
    >
      <extension-page
        v-if="selectedPlugin"
        type="plugin"
        :extension="selectedPlugin"
        :extension-repo="selectedPluginRepo"
        :loading-markdown="loadingPluginReadme"
        @install="install(selectedPlugin)"
        @uninstall="uninstall(selectedPlugin)"
        @update="update(selectedPlugin)"
        @checkForUpdates="checkForUpdates(selectedPlugin)"
      >
        <template #settings>
          <label class="checkbox-group">
            <input
              type="checkbox"
              :checked="autoUpdateEnabled"
              @change="toggleAutoUpdate"
            >
            <span>Auto-update</span>
          </label>
          <label
            class="checkbox-group"
            v-tooltip="'Only allow this plugin to run Read Only queries against your database'"
          >
            <input
              type="checkbox"
              :checked="pluginReadOnly"
              @change="toggleReadOnly"
            >
            <span>Read-Only</span>
          </label>
        </template>
      </extension-page>
    </config-page>
    <config-page
      id="plugin-config"
      title="Plugin Configuration"
    >
      <control-row
        title="Auto update"
        description="Allow plugins to be automatically updated on application launch."
      >
        <x-switch
          @click.prevent="autoUpdate = !autoUpdate"
          :toggled="autoUpdate"
        />
      </control-row>
      <control-row
        title="Official Plugins"
        :highlighted="highlightOptIn"
        description="Official Plugins are built and maintained by the Beekeeper Studio Team"
      >
        <x-switch
          @click.prevent="officialEnabled = !officialEnabled"
          :toggled="officialEnabled"
        />
      </control-row>
      <control-row
        title="Community Plugins"
        :highlighted="highlightOptIn"
        description="Community plugins are developed and maintained by independent third parties, not by Beekeeper Studio. Use at your own risk."
      >
        <x-switch
          @click.prevent="communityEnabled = !communityEnabled"
          :toggled="communityEnabled"
        />
      </control-row>
      <control-row
        title="Custom Registries"
        description="Enable custom registries to find plugins from. These can be configured in your ini file."
      >
        <x-switch
          @click.prevent="customEnabled = !customEnabled"
          :toggled="customEnabled"
        />
      </control-row>
      <control-row
        title="Unlisted Plugins"
        description="Enable unlisted plugins. These are anonymous plugins not found in a registry, just placed in your plugin directory manually."
      >
        <x-switch
          @click.prevent="unlistedEnabled = !unlistedEnabled"
          :toggled="unlistedEnabled"
        />
      </control-row>
      <control-row
        title="Github Token"
        description="Github requests are rate limited. If you find yourself running into issues, setting this will increase that limit."
      >
        <input
          type="password"
          :value="githubToken"
          @change="saveGithubToken($event.target.value)"
        >
      </control-row>
    </config-page>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import { mapGetters, mapState } from "vuex";
import ConfigPage from "@/components/common/config/ConfigPage.vue";
import ControlRow from "@/components/common/ControlRow.vue";
import ExtensionPage from "@/components/plugins/ExtensionPage.vue";
import PluginList from "@/components/plugins/PluginList.vue";
import type { ExtensionRegistryEntry, ExtensionUI } from "@/services/plugin/types";
import rawLog from "@bksLogger";
import _ from "lodash";
import ErrorAlert from "@/components/common/ErrorAlert.vue";
import PluginDisabledOverlay from "@/components/plugins/PluginDisabledOverlay.vue";
import { SmartLocalStorage } from "@/common/LocalStorage";
import type { PluginSnapshot, ExtensionOrigin } from "@/services/plugin";

const log = rawLog.scope("PluginsConfig");

const ORIGIN_ORDER: Record<ExtensionOrigin, number> = {
  "official": 0,
  "community": 1,
  "custom": 2,
  "unlisted": 3,
  // This shouldn't happen, we exclude bundled from the list
  "bundled": Number.MAX_SAFE_INTEGER
};

export default Vue.extend({
  name: "PluginsConfig",
  components: {
    ConfigPage,
    ControlRow,
    ExtensionPage,
    PluginList,
    PluginDisabledOverlay,
    ErrorAlert,
  },
  inject: ["config"],
  data() {
    return {
      highlightOptIn: false,
      optInAlertDismissed: SmartLocalStorage.getBool(
        "pluginOptInAlertDismissed"
      ),
      plugins: [] as ExtensionUI[],
      selectedPluginIdx: -1,
      selectedPluginRepo: null,
      loadingPluginReadme: false,
      autoUpdateEnabled: true,
      pluginReadOnly: true,
      errors: null,
      loadingPlugins: false,
    };
  },
  computed: {
    ...mapState(["pluginManagerStatus"]),
    ...mapState("plugins/snapshots", {
      snapshots: "all",
    }),
    ...mapState("settings", ["settings"]),
    ...mapGetters("plugins/entries", {
      entries: "all",
    }),
    ...mapGetters("plugins/snapshots", ['snapshotsById']),
    selectedPlugin() {
      return this.plugins[this.selectedPluginIdx];
    },
    sortedInstalledPlugins() {
      return _.sortBy(this.displayPlugins.filter((plugin) => plugin.installed), this.pluginSorter);
    },
    sortedPlugins() {
      return _.sortBy(this.displayPlugins, this.pluginSorter);
    },
    displayPlugins(): ExtensionUI[] {
      return this.plugins.map((plugin) => ({
        ...plugin,
        disabled: this.snapshotsById[plugin.id]?.disableState.disabled
      }));
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
        await this.reinitPluginData();
        if (value) {
          this.dismissOptInAlert();
        }
      }
    },
    officialEnabled: {
      get() {
        return !this.$bksConfig.pluginSystem.officialDisabled;
      },
      async set(value) {
        await this.$util.send('config/writeUserValue', { path: 'pluginSystem.officialDisabled', value: !value });
        await this.reinitPluginData();
        if (value) {
          this.dismissOptInAlert();
        }
      }
    },
    customEnabled: {
      get() {
        return !this.$bksConfig.pluginSystem.thirdPartyRegistriesDisabled;
      },
      async set(value) {
        await this.$util.send('config/writeUserValue', { path: 'pluginSystem.thirdPartyRegistriesDisabled', value: !value });
        await this.reinitPluginData();
      }
    },
    unlistedEnabled: {
      get() {
        return !this.$bksConfig.pluginSystem.unlistedDisabled;
      },
      async set(value) {
        await this.$util.send('config/writeUserValue', { path: 'pluginSystem.unlistedDisabled', value: !value });
        await this.reinitPluginData();
      }
    },
    githubToken() {
      return this.settings.pluginGithubToken?.value ?? "";
    }
  },
  watch: {
    "config.activePageId"() {
      if (this.config.activePageId !== "plugin-config") {
        this.highlightOptIn = false;
      }
    },
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
    loadingPlugins() {
      this.$emit("loading", this.loadingPlugins);
    },
  },
  methods: {
    dismissOptInAlert() {
      SmartLocalStorage.setBool("pluginOptInAlertDismissed", true);
      this.optInAlertDismissed = true;
    },
    async reinitPluginData() {
      if (this.pluginManagerStatus === "ready") {
        this.plugins = [];
        await this.$store.dispatch("plugins/initialize");
        await this.loadPlugins();
      }
    },
    async loadPlugins() {
      this.loadingPlugins = true;

      try {
        this.plugins = await this.buildPluginListData();
      } catch (e) {
        log.error(e);
      }

      this.loadingPlugins = false;
    },
    // grrr observability
    updatePlugin(id: string, updated: Partial<ExtensionUI>) {
      const idx = this.plugins.findIndex((p) => p.id === id);
      if (idx === -1) return;
      this.$set(this.plugins, idx, { ...this.plugins[idx], ...updated });
    },
    async install({ id }) {
      try {
        this.updatePlugin(id, { installing: true, error: null });
        await this.$plugin.install(id);
        this.updatePlugin(id, { installed: true, loadable: true });
      } catch (e) {
        log.error(e);
        this.updatePlugin(id, { error: e });
        this.$noty.error(`Failed to install plugin: ${e.message}`);
      } finally {
        this.updatePlugin(id, { installing: false });
      }
    },
    async update({ id }) {
      try {
        this.updatePlugin(id, { installing: true, error: null });
        const manifest = await this.$plugin.update(id);
        this.updatePlugin(id, {
          version: manifest.version,
          updateAvailable: false,
          loadable: true,
        });
      } catch (e) {
        log.error(e);
        this.updatePlugin(id, { error: e });
        this.$noty.error(`Failed to update plugin: ${e.message}`);
      } finally {
        this.updatePlugin(id, { installing: false });
      }
    },
    async checkForUpdates({ id }) {
      try {
        this.updatePlugin(id, { checkingForUpdates: true });
        this.updatePlugin(id, {
          updateAvailable: await this.$util.send("plugin/checkForUpdates", {
            id,
          }),
        });
      } catch (e) {
        log.error(e);
        this.$noty.error(`Failed to check for update: ${e.message}`);
      } finally {
        this.updatePlugin(id, { checkingForUpdates: false });
      }
    },
    async checkAllForUpdates() {
      const installed = this.plugins.filter((plugin) => plugin.installed && plugin.repo);
      await Promise.all(installed.map((plugin) => this.checkForUpdates(plugin)));
    },
    async uninstall({ id }) {
      const confirmed = await this.$confirm(
        "Are you sure you want to uninstall?",
        undefined,
        { confirmLabel: "Uninstall", variant: "danger" }
      );
      if (!confirmed) {
        return;
      }

      try {
        await this.$plugin.uninstall(id);
        this.updatePlugin(id, { installed: false });
      } catch (e) {
        log.error(e);
        this.updatePlugin(id, { error: e });
        this.$noty.error(`Failed to uninstall plugin: ${e.message}`);
      }
    },
    async getAutoUpdateSetting(id: string) {
      this.autoUpdateEnabled = await this.$util.send(
        "plugin/getPluginSetting",
        { id, key: 'autoUpdate' }
      );
    },
    async toggleAutoUpdate(event) {
      const enabled = event.target.checked;
      await this.$util.send("plugin/setPluginSetting", {
        id: this.selectedPlugin.id,
        key: 'autoUpdate',
        value: enabled,
      });
      this.autoUpdateEnabled = enabled;
    },
    async getReadOnlySetting(id: string) {
      this.pluginReadOnly = await this.$util.send(
        "plugin/getPluginSetting",
        { id, key: 'readOnly' }
      )
    },
    async toggleReadOnly(event) {
      const value = event.target.checked;
      await this.$util.send("plugin/setPluginSetting", {
        id: this.selectedPlugin.id,
        key: 'readOnly',
        value
      });
      this.pluginReadOnly = value;
    },
    async openPluginPage({ id }) {
      this.selectedPluginIdx = this.plugins.findIndex((p) => p.id === id);
      this.selectedPluginRepo = null;
      this.loadingPluginReadme = true;
      this.config.open("plugin-detail");
      await this.getAutoUpdateSetting(id);
      await this.getReadOnlySetting(id);
      try {
        this.selectedPluginRepo = await this.$util.send("plugin/repository", { id });
      } catch (e) {
        log.error(e);
        this.$noty.error(`Error opening plugin page: ${e.message}`);
      }
      this.loadingPluginReadme = false;
    },
    async buildPluginListData() {
      const entries: ExtensionRegistryEntry[] = this.entries;
      const installedPlugins: PluginSnapshot[] = this.snapshots;
      const list: ExtensionUI[] = [];

      for (const { manifest, loadable, origin } of installedPlugins) {
        const data: ExtensionUI = {
          ...manifest,
          installed: true,
          installing: false,
          checkingForUpdates: null,
          loadable,
          origin
        } as ExtensionUI;

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
          const data: ExtensionUI = {
            ...entry,
            installed: false,
            installing: false,
            checkingForUpdates: null,
          } as ExtensionUI;

          list.push(data);
        }
      }

      return list;
    },
    pluginSorter(p: ExtensionUI) {
      return (
        ORIGIN_ORDER[p.origin] + (p.installed ? 0 : 10) + (p.disabled ? 20 : 0)
      );
    },
    async saveGithubToken(value: string) {
      await this.$settings.set('pluginGithubToken', value);
    }
  },
});
</script>

<style lang="scss" scoped>
$gutter-h: 1.5rem;

.alerts {
  margin-inline: 1.25rem;
}

.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding-inline: 0.5rem;
}

.installed-plugin-list {
  flex: 1 1 auto;
  min-height: 0;
}

.plugin-manager-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;
}

</style>
