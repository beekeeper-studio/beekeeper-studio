<template>
  <portal to="modals">
    <modal
      :name="modalName"
      :class="['vue-dialog', 'beekeeper-modal', 'plugin-manager-modal', { 'plugin-page-open': selectedPlugin }]"
    >
      <div class="dialog-content">
        <div class="dialog-c-title">
          <i class="material-icons">extension</i>
          Plugins
        </div>
        <div class="top-right-buttons">
          <button
            class="btn btn-fab"
            @click.prevent="loadPlugins(true)"
            title="Refresh list"
          >
            <i class="material-icons">refresh</i>
          </button>
          <button
            class="btn btn-fab"
            @click.prevent="close"
            title="Close"
          >
            <i class="material-icons">clear</i>
          </button>
        </div>
        <x-progressbar v-if="loadingPlugins" style="margin-top: -5px" />
        <div class="plugin-manager-content">
          <div class="plugin-list-container" :class="{ shrink: selectedPlugin }">
            <div class="description">
              Manage and install plugins in Beekeeper Studio.
              <a href="https://docs.beekeeperstudio.io/user_guide/plugins/" class="link">Learn more</a>.
            </div>
            <error-alert :error="errors" />
            <div class="plugin-list-filter">
              <label for="plugin-list-filter">Filter</label>
              <select id="plugin-list-filter" v-model="filter">
                <option value="all">All</option>
                <option value="installed">Installed</option>
                <option value="core">Core</option>
                <option value="community">Community</option>
              </select>
            </div>
            <div class="scroll-container">
              <plugin-list
                :plugins="filteredPlugins"
                @install="install"
                @uninstall="uninstall"
                @update="update"
                @item-click="openPluginPage"
                @checkForUpdates="checkForUpdates"
              />
            </div>
          </div>
          <transition name="slide-fade">
            <plugin-page
              v-if="selectedPlugin"
              :plugin="selectedPlugin"
              :markdown="selectedPluginReadme"
              :loading-markdown="loadingPluginReadme"
              @install="install(selectedPlugin)"
              @uninstall="uninstall(selectedPlugin)"
              @update="update(selectedPlugin)"
              @checkForUpdates="checkForUpdates(selectedPlugin)"
            />
          </transition>
        </div>
      </div>
    </modal>
  </portal>
</template>

<script lang="ts">
import Vue from "vue";
import { AppEvent } from "@/common/AppEvent";
import rawLog from "@bksLogger";
import PluginList from "./PluginList.vue";
import PluginPage from "./PluginPage.vue";
import _ from "lodash";
import ErrorAlert from "@/components/common/ErrorAlert.vue";
import type { PluginSnapshot, PluginRegistryEntry, Manifest, UIPlugin } from "@/services/plugin/types";
import { mapState } from "vuex";

const log = rawLog.scope("PluginManagerModal");

export default Vue.extend({
  components: { PluginList, PluginPage, ErrorAlert },
  data() {
    return {
      modalName: "plugin-manager-modal",
      plugins: [] as UIPlugin[],
      selectedPluginIdx: -1,
      selectedPluginReadme: "",
      loadingPluginReadme: false,
      loadedPlugins: false,
      errors: null,
      loadingPlugins: false,
      filter: "all" as "all" | "installed" | "core" | "community",
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
    ...mapState([ "pluginManagerStatus" ]),
    ...mapState({
      pluginSnapshots: "installedPlugins",
    }),
    rootBindings() {
      return [{ event: AppEvent.openPluginManager, handler: this.open }];
    },
    selectedPlugin() {
      return this.plugins[this.selectedPluginIdx];
    },
    filteredPlugins() {
      switch (this.filter) {
        case "all":
          return this.plugins;
        case "installed":
          return this.installedPlugins;
        case "core":
          return this.corePlugins;
        case "community":
          return this.communityPlugins;
        default:
          return [];
      }
    },
    corePlugins() {
      return this.plugins.filter((plugin: UIPlugin) => plugin.origin === "core");
    },
    communityPlugins() {
      return this.plugins.filter((plugin: UIPlugin) => plugin.origin === "community");
    },
    installedPlugins() {
      return this.plugins.filter((plugin: UIPlugin) => plugin.installed);
    },
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
    }
  },
  methods: {
    async loadPlugins(refresh?: boolean) {
      this.loadingPlugins = true;

      try {
        this.plugins = await this.buildPluginListData(refresh);
      } catch (e) {
        this.$noty.error("Failed to load plugins");
        log.error(e);
      }

      this.loadingPlugins = false;
    },
    async install({ id }) {
      const state: UIPlugin = this.plugins.find((p) => p.id === id);

      try {
        state.error = undefined;
        state.installing = true;

        const manifest = await this.$plugin.install(id);

        state.installed = true;
        state.installedVersion = manifest.version;
        state.compatible = true;
        state.error = undefined;
      } catch (e) {
        log.error(e);
        state.error = e;
        this.$noty.error(`Failed to install plugin: ${e.message}`);
      } finally {
        state.installing = false;
      }
    },
    async update({ id }) {
      const state: UIPlugin = this.plugins.find((p) => p.id === id);

      try {
        state.error = undefined;
        state.installing = true;

        const manifest = await this.$plugin.update(id);

        state.installedVersion = manifest.version;
        state.updateAvailable = false;
        // HACK(azmi): refresh the plugin list or just this item instead
        state.compatible = true;
      } catch (e) {
        log.error(e);
        state.error = e;
        this.$noty.error(`Failed to update plugin: ${e.message}`);
      } finally {
        state.installing = false;
      }
    },
    async checkForUpdates({ id }) {
      const state: UIPlugin = this.plugins.find((p) => p.id === id);

      try {
        state.error = undefined;
        state.checkingForUpdates = true;

        state.updateAvailable = await this.$util.send(
          "plugin/checkForUpdates",
          { id }
        );
      } catch (e) {
        log.error(e);
        this.$noty.error(`Failed to check for update: ${e.message}`);
      } finally {
        state.checkingForUpdates = false;
      }
    },
    async uninstall({ id }) {
      if (!(await this.$confirm("Are you sure you want to uninstall?"))) {
        return;
      }

      const state: UIPlugin = this.plugins.find((p) => p.id === id);

      try {
        state.error = undefined;

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
      this.selectedPluginReadme = "";
      this.loadingPluginReadme = true;
      try {
        const info = await this.$util.send("plugin/repository", { id });
        this.selectedPluginReadme = info.readme;
      } catch (e) {
        log.warn(e);
      }
      this.loadingPluginReadme = false;
    },
    async buildPluginListData(refresh?: boolean): Promise<UIPlugin[]> {
      const list: UIPlugin[] = [];

      const entries: PluginRegistryEntry[] = await this.$plugin.getPluginEntries();

      for (const entry of entries) {
        list.push({
          id: entry.id,
          name: entry.name,
          author: entry.author,
          description: entry.description,

          installed: false,
          installing: false,

          updateAvailable: false,
          checkingForUpdates: null,

          disabled: false,
          repo: entry.repo,
          origin: entry.metadata.origin,
        });
      }

      const pluginSnapshots: PluginSnapshot[] = this.pluginSnapshots;

      for (const snapshot of pluginSnapshots) {
        const { manifest, compatible, origin } = snapshot;
        let data = list.find((p) => p.id === manifest.id);
        if (data) {
          data.installed = true;
          data.installedVersion = manifest.version;
          data.compatible = compatible;
          data.checkingForUpdates = true;
          data.minAppVersion = manifest.minAppVersion;
        } else {
          data = {
            id: manifest.id,
            name: manifest.name,
            author: manifest.author,
            description: manifest.description,

            compatible,
            installed: true,
            installedVersion: manifest.version,
            installing: false,

            updateAvailable: false,
            checkingForUpdates: null,

            disabled: false,
            minAppVersion: manifest.minAppVersion,
            origin,
          };
          list.push(data);
        }
        if (snapshot.disabled) {
          data.disabled = snapshot.disabled;
          data.disableReasons = snapshot.disableReasons;
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
  },
});
</script>

<style scoped>
.dialog-c-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.top-right-buttons {
  position: absolute;
  top: 1.5rem;
  right: 1.5rem;
  display: flex;
  gap: 0.5rem;

  .btn {
    &:not(:hover) {
      background-color: transparent;
    }

    .material-icons {
      color: var(--text-dark);
    }
  }
}

.plugin-manager-content {
  height: calc(100% - 47.6px);
}

.plugin-list-container.shrink {
  width: 23rem;
}

.plugin-list-filter {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1rem;
  margin-bottom: 0.5rem;
  margin-right: auto;
  margin-left: 1.5rem;
}

.scroll-container {
  overflow-y: auto;
  min-height: 0;
}

.link {
  color: var(--theme-primary);

  &:hover {
    color: var(--theme-primary);
    text-decoration: underline;
  }
}

.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.3s ease;
}

.slide-fade-enter,
.slide-fade-leave-to {
  transform: translateX(20px);
  opacity: 0;
}

.collapsible-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  user-select: none;
  transition: color 0.2s ease;

  &:hover {
    color: var(--theme-primary);
  }

  .expand-icon {
    font-size: 1.25rem;
    transition: transform 0.3s ease;

    &.expanded {
      transform: rotate(90deg);
    }
  }
}

.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease;
  max-height: 1000px;
  overflow: hidden;
}

.expand-enter,
.expand-leave-to {
  max-height: 0;
  opacity: 0;
}
</style>
