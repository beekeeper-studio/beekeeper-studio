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
          <button class="btn btn-fab" @click.prevent="loadPlugins(true)">
            <i class="material-icons">refresh</i>
          </button>
          <button class="btn btn-fab" @click.prevent="close">
            <i class="material-icons">clear</i>
          </button>
        </div>
        <x-progressbar v-if="loadingPlugins" style="margin-top: -5px" />
        <div class="plugin-manager-content">
          <div class="plugin-list-container">
            <div class="description">
              Manage and install plugins in Beekeeper Studio.
              <a href="https://docs.beekeeperstudio.io/user_guide/plugins/" class="link">Learn more</a>.
            </div>
            <error-alert :error="errors" />
            <plugin-list
              :plugins="plugins"
              @install="install"
              @uninstall="uninstall"
              @update="update"
              @item-click="openPluginPage"
              @checkForUpdates="checkForUpdates"
            />
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
import type { TransportPlugin, PluginRegistryEntry, Manifest, UIPlugin } from "@/services/plugin/types";
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
    rootBindings() {
      return [{ event: AppEvent.openPluginManager, handler: this.open }];
    },
    selectedPlugin() {
      return this.plugins[this.selectedPluginIdx];
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
      const state = this.plugins.find((p) => p.id === id);

      try {
        state.installing = true;
        await this.$plugin.install(id);
        state.installed = true;
        // HACK(azmi): refresh the plugin list or just this item instead
        state.loadable = true;
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
      const state = this.plugins.find((p) => p.id === id);

      try {
        state.installing = true;
        const manifest = await this.$plugin.update(id);
        state.version = manifest.version;
        state.updateAvailable = false;
        // HACK(azmi): refresh the plugin list or just this item instead
        state.loadable = true;
        state.error = undefined;
      } catch (e) {
        log.error(e);
        state.error = e;
        this.$noty.error(`Failed to update plugin: ${e.message}`);
      } finally {
        state.installing = false;
      }
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

      const state: UIPlugin = this.plugins.find((p) => p.id === id);

      try {
        await this.$plugin.uninstall(id);
        state.installed = false;
        state.error = undefined;
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
    checkOfficialPlugin(
      author?: Manifest['author'],
      repo?: PluginRegistryEntry['repo']
    ) {
      if (author) {
        if (typeof author === "string") {
          if(author === "Beekeeper Studio") {
            return true;
          }
          return false;
        }
        return author.name === "Beekeeper Studio";
      }
      if (repo) {
        return repo.startsWith("beekeeper-studio/");
      }
      return false;
    },
    async buildPluginListData(refresh?: boolean): Promise<UIPlugin[]> {
      const entries: PluginRegistryEntry[] = await this.$util.send("plugin/entries", refresh)
      const installedPlugins: TransportPlugin[] = await this.$plugin.plugins;
      const list: UIPlugin[] = [];

      for (const { manifest, loadable, disabled } of installedPlugins) {
        const data: UIPlugin = {
          id: manifest.id,
          name: manifest.name,
          author: manifest.author,
          description: manifest.description,

          compatible: true,
          loadable,
          installed: true,
          installing: false,

          updateAvailable: false,
          checkingForUpdates: null,

          disabled,
          minAppVersion: manifest.minAppVersion,
          officialPlugin: this.checkOfficialPlugin(manifest.author),
        };

        const entry = entries.find((entry) => entry.id === manifest.id);

        // if the plugin is found in the beekeeper-studio-plugins
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
          const data: UIPlugin = {
            id: entry.id,
            name: entry.name,
            author: entry.author,
            description: entry.description,

            compatible: true,
            installed: false,
            installing: false,

            updateAvailable: false,
            checkingForUpdates: null,

            disabled: false,
            repo: entry.repo,
            officialPlugin: this.checkOfficialPlugin(entry.author, entry.repo),
          };

          list.push(data);
        }
      }

      const rank = (p: UIPlugin) => {
        if (p.installed && !p.disabled) return 0; // installed & enabled
        if (p.installed && p.disabled) return 1;  // installed & disabled
        return 2;                                 // not installed
      };

      return list.sort((a, b) => rank(a) - rank(b));
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

.plugin-list-container {
  flex-basis: 28%;
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
</style>
