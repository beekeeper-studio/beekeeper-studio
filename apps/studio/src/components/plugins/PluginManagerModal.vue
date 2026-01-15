<template>
  <portal to="modals">
    <modal :name="modalName" :class="[
      'vue-dialog',
      'beekeeper-modal',
      'plugin-manager-modal',
      { 'plugin-page-open': selectedPlugin },
    ]">
      <div class="dialog-content">
        <div class="dialog-c-title">
          <i class="material-icons">extension</i>
          Plugins
        </div>
        <div class="top-right-buttons">
          <button class="btn btn-fab" @click.prevent="$plugin.updatePluginEntries()" :disabled="loadingPluginEntries"
            title="Refresh list">
            <i class="material-icons">refresh</i>
          </button>
          <button class="btn btn-fab" @click.prevent="close" title="Close">
            <i class="material-icons">clear</i>
          </button>
        </div>
        <x-progressbar v-if="pluginManagerStatus === 'initializing' || loadingPluginEntries" style="margin-top: -5px" />
        <div class="plugin-manager-content">
          <div class="plugin-list-container" :class="{ shrink: selectedPlugin }">
            <div class="description">
              Plugins are mini-applications that run inside Beekeeper Studio to provide specialized functionality.
              <a href="https://docs.beekeeperstudio.io/user_guide/plugins/" class="link">Learn more</a>.
            </div>
            <div class="alert-wrapper" v-if="showPluginDevInfo">
              <div class="alert alert-info">
                <i class="material-icons">info_outlined</i>
                <div class="alert-body">
                  <p>
                    Interested to develop your own plugins? Check out our
                    <a
                      href="https://docs.beekeeperstudio.io/plugin_development/"
                    >documentation</a>
                    to get started!
                  </p>
                </div>
                <button
                  class="btn btn-fab btn-flat"
                  @click.prevent="showPluginDevInfo = false"
                  title="Don't show this again"
                >
                  <i class="material-icons">close</i>
                </button>
              </div>
            </div>
            <div
              v-if="pluginManagerStatus === 'failed-to-initialize'"
              class="alert-wrapper"
            >
              <error-alert
                :error="[{
                  message:
                    'Plugin system was not initialized properly. ' +
                    'Please restart Beekeeper Studio to continue using plugins. ' +
                    'If this persists, please report it on our issue tracker.',
                  helpLink:
                    'https://github.com/beekeeper-studio/beekeeper-studio/issues/new/choose',
                }]"
                linkText="Report issue"
              />
            </div>
            <div class="plugin-list-filter" v-else>
              <label for="plugin-list-filter">Filter</label>
              <select id="plugin-list-filter" v-model="filter">
                <option value="all">All</option>
                <option value="installed">Installed</option>
                <option value="core">Core</option>
                <option value="community">Community</option>
              </select>
            </div>
            <div class="scroll-container">
              <div v-if="filteredPlugins.length === 0" class="empty-state">No plugins</div>
              <plugin-list :plugins="filteredPlugins" @install="install" @uninstall="uninstall" @update="update"
                @item-click="openPluginPage" @checkForUpdates="checkForUpdates" />
            </div>
          </div>
          <transition name="slide-fade">
            <plugin-page v-if="selectedPlugin" :plugin="selectedPlugin" :markdown="selectedPluginReadme"
              :loading-markdown="loadingPluginReadme" @install="install(selectedPlugin)"
              @uninstall="uninstall(selectedPlugin)" @update="update(selectedPlugin)"
              @checkForUpdates="checkForUpdates(selectedPlugin)" />
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
import type { PluginSnapshot, PluginRegistryEntry, UIPlugin, UIPluginState } from "@/services/plugin/types";
import { mapState } from "vuex";
import { SmartLocalStorage } from "@/common/LocalStorage";

const log = rawLog.scope("PluginManagerModal");
const defaultUIPluginState: UIPluginState = {
  installing: false,
  updateAvailable: false,
  checkingForUpdates: null,
};

export default Vue.extend({
  components: { PluginList, PluginPage, ErrorAlert },
  data() {
    return {
      modalName: "plugin-manager-modal",
      pluginStates: {} as Record<string, UIPluginState>,
      selectedPluginId: "",
      selectedPluginReadme: "",
      loadingPluginReadme: false,
      filter: SmartLocalStorage.getJSON(
        "pluginManagerModalFilter",
        "all"
      ) as "all" | "installed" | "core" | "community",
      showPluginDevInfo: SmartLocalStorage.getBool("showPluginDevInfo", true),
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
    ...mapState(["pluginManagerStatus", "pluginSnapshots", "pluginEntries", "loadingPluginEntries"]),
    rootBindings() {
      return [{ event: AppEvent.openPluginManager, handler: this.open }];
    },
    selectedPlugin() {
      return this.plugins.find((p: UIPlugin) => p.id === this.selectedPluginId);
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
          return [];
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
    plugins(): UIPlugin[] {
      const list: UIPlugin[] = [];
      const entries: PluginRegistryEntry[] = this.pluginEntries;
      const pluginSnapshots: PluginSnapshot[] = this.pluginSnapshots;
      const pluginStates: Record<string, UIPluginState> = this.pluginStates;

      for (const entry of entries) {
        list.push({
          id: entry.id,
          name: entry.name,
          author: entry.author,
          description: entry.description,
          repo: entry.repo,
          origin: entry.metadata.origin,
          disabled: false,
          installed: false,
          ...(pluginStates[entry.id] || defaultUIPluginState),
        });
      }

      for (const snapshot of pluginSnapshots) {
        const data: UIPlugin = {
          id: snapshot.manifest.id,
          name: snapshot.manifest.name,
          author: snapshot.manifest.author,
          description: snapshot.manifest.description,
          minAppVersion: snapshot.manifest.minAppVersion,
          compatible: snapshot.compatible,
          origin: snapshot.origin,
          installed: true,
          installedVersion: snapshot.manifest.version,
          disabled: snapshot.disabled,
          disableReasons: snapshot.disableReasons,
          ...(pluginStates[snapshot.manifest.id] || defaultUIPluginState),
        }
        const dataIdx = list.findIndex((p) => p.id === snapshot.manifest.id);
        if (dataIdx !== -1) {
          list[dataIdx] = data;
        } else {
          list.push(data);
        }
      }

      return list;
    },
  },
  watch: {
    filter() {
      SmartLocalStorage.addItem("pluginManagerModalFilter", this.filter);
    },
    showPluginDevInfo() {
      SmartLocalStorage.addItem("showPluginDevInfo", this.showPluginDevInfo);
    },
  },
  methods: {
    upsertPluginState(id: string, state: Partial<UIPluginState>) {
      Vue.set(this.pluginStates, id, {
        ...(this.pluginStates[id] || defaultUIPluginState),
        ...state,
      });
    },
    async install({ id }) {
      try {
        this.upsertPluginState(id, { error: undefined, installing: true });
        await this.$plugin.install(id);
      } catch (e) {
        log.error(e);
        this.upsertPluginState(id, { error: e });
        this.$noty.error(`Failed to install plugin: ${e.message}`);
      } finally {
        this.upsertPluginState(id, { installing: false });
      }
    },
    async update({ id }) {
      try {
        this.upsertPluginState(id, { error: undefined, installing: true });
        await this.$plugin.update(id);
        this.upsertPluginState(id, {
          updateAvailable: false,
          compatible: true,
        });
      } catch (e) {
        log.error(e);
        this.upsertPluginState(id, { error: e });
        this.$noty.error(`Failed to update plugin: ${e.message}`);
      } finally {
        this.upsertPluginState(id, { installing: false });
      }
    },
    async checkForUpdates({ id }) {
      try {
        this.upsertPluginState(id, {
          error: undefined,
          checkingForUpdates: true,
        });
        const updateAvailable = await this.$util.send(
          "plugin/checkForUpdates",
          { id }
        );
        this.upsertPluginState(id, { updateAvailable });
      } catch (e) {
        log.error(e);
        this.$noty.error(`Failed to check for update: ${e.message}`);
      } finally {
        this.upsertPluginState(id, { checkingForUpdates: false });
      }
    },
    async uninstall({ id }) {
      if (!(await this.$confirm("Are you sure you want to uninstall?"))) {
        return;
      }

      try {
        this.upsertPluginState(id, { error: undefined });
        await this.$plugin.uninstall(id);
      } catch (e) {
        log.error(e);
        this.upsertPluginState(id, { error: e });
        this.$noty.error(`Failed to uninstall plugin: ${e.message}`);
      }
    },
    async openPluginPage({ id }) {
      this.selectedPluginId = id;
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

.empty-state {
  padding: 1rem 1.5rem;
  color: var(--text);
}

.alert-wrapper {
  margin: 0.25rem 1.5rem;
  .material-icons {
    margin-right: 0;
  }
  .btn-fab:not(:hover) {
    background-color: transparent;
  }
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
