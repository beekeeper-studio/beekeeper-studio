<template>
  <portal to="modals">
    <modal
      :name="modalName"
      class="vue-dialog beekeeper-modal plugin-manager-modal"
    >
      <div class="dialog-content">
        <div class="dialog-c-title">Plugins</div>
        <a class="close-btn btn btn-fab" href="#" @click.prevent="close">
          <i class="material-icons">clear</i>
        </a>
        <x-progressbar
          v-if="loadingPlugins"
          style="margin-top: -5px;"
        />
        <div class="plugin-manager-content">
          <div class="plugin-list-container">
            <div class="description">
              Manage and install plugins in Beekeeper Studio.
            </div>
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
import { CommonPluginInfo } from "@/services/plugin/types";
import PluginList from "./PluginList.vue";
import PluginPage from "./PluginPage.vue";
import _ from "lodash";

const log = rawLog.scope("PluginManagerModal");

export default Vue.extend({
  components: { PluginList, PluginPage },
  data() {
    return {
      modalName: "plugin-manager-modal",
      plugins: [],
      selectedPluginIdx: -1,
      selectedPluginReadme: null,
      selectedPluginRemoteManifest: null,
      loadedPlugins: false,
      loadingPlugins: false,
    };
  },
  async mounted() {
    this.registerHandlers(this.rootBindings);
  },
  beforeDestroy() {
    this.unregisterHandlers(this.rootBindings);
  },
  computed: {
    rootBindings() {
      return [{ event: AppEvent.openPluginManager, handler: this.open }];
    },
    selectedPlugin() {
      return this.plugins[this.selectedPluginIdx];
    },
  },
  methods: {
    async install(plugin: CommonPluginInfo) {
      const state = this.plugins.find(
        (p: CommonPluginInfo) => p.id === plugin.id
      );

      try {
        state.installing = true;
        await this.$plugin.install(plugin);
        state.installed = true;
      } catch (e) {
        log.error(e);
        this.$noty.error(`Failed to install plugin: ${e.message}`);
      } finally {
        state.installing = false;
      }
    },
    async update(plugin: CommonPluginInfo) {
      const state = this.plugins.find(
        (p: CommonPluginInfo) => p.id === plugin.id
      );

      try {
        state.installing = true;
        await this.$plugin.update(plugin);
        state.updateAvailable = false;
      } catch (e) {
        log.error(e);
        this.$noty.error(`Failed to update plugin: ${e.message}`);
      } finally {
        state.installing = false;
      }
    },
    async checkForUpdates(plugin: CommonPluginInfo) {
      const idx = this.plugins.findIndex(
        (p: CommonPluginInfo) => p.id === plugin.id
      );

      try {
        this.$set(this.plugins, idx, {
          ...this.plugins[idx],
          checkingForUpdates: true,
        });
        this.$set(this.plugins, idx, {
          ...this.plugins[idx],
          updateAvailable: await this.$plugin.checkForUpdates(plugin),
        })
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
    async uninstall(plugin: CommonPluginInfo) {
      if (!(await this.$confirm("Are you sure you want to uninstall?"))) {
        return;
      }

      const state = this.plugins.find(
        (p: CommonPluginInfo) => p.id === plugin.id
      );

      try {
        await this.$plugin.uninstall(plugin);
        state.installed = false;
      } catch (e) {
        log.error(e);
        this.$noty.error(`Failed to uninstall plugin: ${e.message}`);
      }
    },
    async openPluginPage(plugin: CommonPluginInfo) {
      this.selectedPluginIdx = this.plugins.findIndex(
        (p: CommonPluginInfo) => p.id === plugin.id
      );
      const info = await this.$plugin.getRepositoryInfo(plugin);
      this.selectedPluginReadme = info.readme;
      this.selectedPluginRemoteManifest = info.manifest;
    },
    async buildPluginListData() {
      const entries = await this.$plugin.getAllEntries();
      const installedPlugins = await this.$plugin.getEnabledPlugins();
      const list = []
      console.log({
        entries,
        installedPlugins,
      })

      for (const manifest of installedPlugins) {
        const data = {
          ...manifest,
          installed: true,
          installing: false,
          enabled: true,
          checkingForUpdates: null,
        }

        const entry = entries.find((entry) => entry.id === manifest.id);
        const installedPluginNotFoundInRegistry = !entry;

        if (installedPluginNotFoundInRegistry) {
          // do nothing
        } else {
          data.repo = entry.repo;
          data.updateAvailable = await this.$plugin.checkForUpdates(entry);
        }

        list.push(data);
      }

      for (const entry of entries) {
        if (!_.find(list, { id: entry.id })) {
          const data = {
            ...entry,
            installed: false,
            installing: false,
            enabled: false,
            checkingForUpdates: null,
          }

          list.push(data);
        }
      }

      return list;
    },
    async open() {
      this.$modal.show(this.modalName);
      if (!this.loadedPlugins) {
        console.log('hello?')
        this.loadingPlugins = true;
        this.plugins = await this.buildPluginListData();
        this.loadingPlugins = false;
        this.loadedPlugins = true;
      }
    },
    close() {
      this.$modal.hide(this.modalName);
    },
  },
});
</script>
