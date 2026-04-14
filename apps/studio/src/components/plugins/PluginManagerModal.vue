<template>
  <portal to="modals">
    <modal
      :name="modalName"
      :class="['vue-dialog', 'beekeeper-modal', 'plugin-manager-modal', { 'plugin-page-open': selectedPlugin }]"
    >
      <div class="dialog-content">
        <div class="dialog-c-title">Plugins</div>
        <a class="close-btn btn btn-fab" href="#" @click.prevent="close">
          <i class="material-icons">clear</i>
        </a>
        <x-progressbar v-if="loadingPlugins" style="margin-top: -5px" />
        <div class="plugin-manager-content">
          <div class="plugin-list-container">
            <div class="description">
              Manage and install plugins in Beekeeper Studio.
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
import type { PluginContext, PluginRegistryEntry } from "@/services/plugin";
import { mapGetters, mapState } from "vuex";

const log = rawLog.scope("PluginManagerModal");

export default Vue.extend({
  components: { PluginList, PluginPage, ErrorAlert },
  data() {
    return {
      modalName: "plugin-manager-modal",
      plugins: [],
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
    ...mapGetters("plugins/entries", {
      entries: "all",
    }),
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
          this.loadingPlugins = true;

          try {
            this.plugins = await this.buildPluginListData();
          } catch (e) {
            log.error(e);
          }

          this.loadingPlugins = false;
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
    async buildPluginListData() {
      const entries: PluginRegistryEntry[] = this.entries;
      const installedPlugins: PluginContext[] = await this.$plugin.plugins;
      const list: PluginRegistryEntry[] = [];

      for (const { manifest, loadable } of installedPlugins) {
        const data = {
          ...manifest,
          installed: true,
          installing: false,
          checkingForUpdates: null,
          loadable,
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
          const data = {
            ...entry,
            installed: false,
            installing: false,
            checkingForUpdates: null,
          };

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
  },
});
</script>
