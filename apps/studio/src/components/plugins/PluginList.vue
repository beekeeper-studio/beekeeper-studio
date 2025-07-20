<template>
  <ul class="plugin-list">
    <li
      v-for="plugin in plugins"
      :key="plugin.id"
      class="item"
      tabindex="0"
      @click.prevent="handleItemClick($event, plugin)"
    >
      <div class="info">
        <div class="title">
          {{ plugin.name }}
          <span class="badge" v-if="$bksConfig.plugins?.[plugin.id]?.disabled">disabled</span>
        </div>
        <div class="description">
          {{ plugin.description }}
        </div>
        <div class="author">{{ plugin.author.name || plugin.author }}</div>
      </div>
      <div class="actions">
        <x-button
          v-if="plugin.installed && plugin.updateAvailable"
          class="btn btn-flat"
          :disabled="plugin.installing"
          @click.prevent.stop="$emit('update', plugin)"
        >
          <x-label>
            {{ plugin.installing ? "Updating..." : "Update" }}
          </x-label>
        </x-button>
        <x-button
          v-if="!plugin.installed"
          class="btn btn-flat"
          :disabled="plugin.installing"
          @click.prevent.stop="$emit('install', plugin)"
        >
          <x-label>
            {{ plugin.installing ? "Installing..." : "Install" }}
          </x-label>
        </x-button>
        <x-button
          @click.stop
          class="menu-btn btn btn-fab"
          v-if="plugin.installed"
        >
          <i class="material-icons">more_vert</i>
          <x-menu>
            <x-menuitem @click.prevent="handleItemClick($event, plugin)">
              <x-label>View</x-label>
            </x-menuitem>
            <x-menuitem @click.prevent="$emit('checkForUpdates', plugin)" :disabled="plugin.checkingForUpdates">
              <x-label>Check for updates</x-label>
            </x-menuitem>
            <x-menuitem @click.prevent="$emit('uninstall', plugin)">
              <x-label> Uninstall </x-label>
            </x-menuitem>
          </x-menu>
        </x-button>
      </div>
    </li>
  </ul>
</template>

<script lang="ts">
import Vue, { PropType } from "vue";
import { CommonPluginInfo } from "@/services/plugin/types";

interface Plugin extends CommonPluginInfo {
  installing: boolean;
  installed: boolean;
  enabled: boolean;
}

export default Vue.extend({
  name: "PluginList",
  props: {
    plugins: {
      type: Array as PropType<Plugin[]>,
      required: true,
    },
  },
  methods: {
    handleItemClick(_event: MouseEvent, plugin: CommonPluginInfo) {
      this.$emit("item-click", plugin);
    },
  },
});
</script>
