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
          <div class="plugin-manager-description">
            Manage and install plugins in Beekeeper Studio.
          </div>
          <ul class="plugin-list">
            <li
              v-for="manifest in enabledPlugins"
              :key="manifest.id"
              class="plugin-item"
            >
              <div class="plugin-item-info">
                <div class="plugin-item-title">
                  {{ manifest.name }}
                </div>
                <div class="plugin-item-description">
                  {{ manifest.description }}
                </div>
                <div class="plugin-item-author">{{ manifest.author }}</div>
              </div>
              <x-button class="menu-btn btn btn-fab">
                <i class="material-icons">more_vert</i>
                <x-menu>
                  <x-menuitem>
                    <x-label @click.prevent="uninstall(manifest)">
                      Uninstall
                    </x-label>
                  </x-menuitem>
                </x-menu>
              </x-button>
            </li>
            <li
              v-for="entry in filteredEntries"
              :key="entry.id"
              class="plugin-item"
            >
              <div class="plugin-item-info">
                <div class="plugin-item-title">
                  {{ entry.name }}
                </div>
                <div class="plugin-item-description">
                  {{ entry.description }}
                </div>
                <div class="plugin-item-author">{{ entry.author }}</div>
              </div>
              <x-button class="btn btn-flat" @click.prevent="install(entry)">
                Install
              </x-button>
            </li>
          </ul>
        </div>
      </div>
    </modal>
  </portal>
</template>

<script lang="ts">
import Vue from "vue";
import { AppEvent } from "@/common/AppEvent";
import rawLog from "@bksLogger";
import { Manifest, PluginRegistryEntry } from "@/services/plugin/types";

const log = rawLog.scope("PluginManagerModal");

export default Vue.extend({
  data() {
    return {
      modalName: "plugin-manager-modal",
      entries: [],
      enabledPlugins: [],
    };
  },
  mounted() {
    this.registerHandlers(this.rootBindings);
  },
  beforeDestroy() {
    this.unregisterHandlers(this.rootBindings);
  },
  computed: {
    filteredEntries() {
      return this.entries.filter(
        (entry: PluginRegistryEntry) =>
          !this.enabledPlugins.find(
            (manifest: Manifest) => manifest.id === entry.id
          )
      );
    },
    rootBindings() {
      return [{ event: AppEvent.openPluginManager, handler: this.open }];
    },
  },
  methods: {
    async open() {
      this.$modal.show(this.modalName);
      this.enabledPlugins = await this.$plugin.getEnabledPlugins();
      this.entries = await this.$plugin.getAllEntries();
    },
    close() {
      this.$modal.hide(this.modalName);
    },
    async install(entry: PluginRegistryEntry) {
      try {
        const manifest = await this.$plugin.install(entry);
        this.enabledPlugins.push(manifest);
      } catch (e) {
        log.error(e);
        this.$noty.error(`Failed to install plugin: ${e.message}`);
      }
    },
    async uninstall(manifest: Manifest) {
      if (!(await this.$confirm("Are you sure you want to uninstall?"))) {
        return;
      }

      try {
        await this.$plugin.uninstall(manifest);
        this.enabledPlugins.splice(this.enabledPlugins.indexOf(manifest), 1);
      } catch (e) {
        log.error(e);
        this.$noty.error(`Failed to uninstall plugin: ${e.message}`);
      }
    },
  },
});
</script>
