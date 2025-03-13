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
        <div class="plugin-manager-content">
          <div class="plugin-list-container">
            <div class="description">
              Manage and install plugins in Beekeeper Studio.
            </div>
            <plugin-list
              :plugins="plugins"
              @install="install"
              @uninstall="uninstall"
              @item-click="openPluginPage"
            />
          </div>
          <plugin-page
            v-if="selectedPlugin"
            :plugin="selectedPlugin"
            :markdown="selectedPluginReadme"
            @install="install(selectedPlugin)"
            @uninstall="uninstall(selectedPlugin)"
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
      selectedPlugin: null,
      selectedPluginReadme: null,
    };
  },
  mounted() {
    this.registerHandlers(this.rootBindings);
  },
  beforeDestroy() {
    this.unregisterHandlers(this.rootBindings);
  },
  computed: {
    rootBindings() {
      return [{ event: AppEvent.openPluginManager, handler: this.open }];
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
    async uninstall(plugin: CommonPluginInfo) {
      console.log('hello???', plugin)
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
      this.selectedPlugin = plugin

      const entries = await this.$plugin.getAllEntries();
      const entry = entries.find((entry) => entry.id === plugin.id);

      if (!entry) {
        this.selectedPluginReadme =
          "We could not find the readme for this plugin. :(";
      } else {
        const info = await this.$plugin.getRepositoryInfo(plugin);
        this.selectedPluginReadme = info.readme;
      }
    },
    async buildPluginListData() {
      const entries = await this.$plugin.getAllEntries();
      const installedPlugins = await this.$plugin.getEnabledPlugins();
      installedPlugins.forEach((manifest) => {
        const entry = entries.find((entry) => entry.id === manifest.id);
        if (entry) {
          entry.installed = true;
          entry.installing = false;
          entry.enabled = true;
        } else {
          // This is a plugin that is installed but not found in registry.
          const newEntry = structuredClone(manifest);
          newEntry.installed = true;
          newEntry.installing = false;
          newEntry.enabled = true;
          entries.push(newEntry);
        }
      });
      return entries;
    },
    async open() {
      this.$modal.show(this.modalName);
      this.plugins = await this.buildPluginListData();
    },
    close() {
      this.$modal.hide(this.modalName);
    },
  },
});
</script>
