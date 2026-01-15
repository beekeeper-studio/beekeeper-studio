<template>
  <ul class="plugin-list" v-bind="$attrs">
    <li
      v-for="plugin in plugins"
      :key="plugin.id"
      class="item"
      tabindex="0"
      @click.prevent="handleItemClick($event, plugin)"
    >
      <div class="info">
        <div class="title">
          <span>{{ plugin.name }}</span>
          <span class="badge" v-if="plugin.installed && plugin.disabled">disabled</span>
        </div>
        <div class="status-error" v-if="!plugin.compatible && plugin.installed">
          This plugin requires version {{ plugin.minAppVersion }} or newer.
        </div>
        <div class="status-error" v-if="plugin.error" style="white-space: pre-wrap;">
          <template v-if="plugin.error.toString?.().includes('not compatible')">
            {{ plugin.error.toString().split("Please upgrade")[0] }}
          </template>
          <template v-else>{{ plugin.error }}</template>
        </div>
        <div class="description">
          {{ plugin.description }}
        </div>
        <div class="author">
          By
          {{ typeof plugin.author === 'string' ? plugin.author : plugin.author.name }}
          <i
            v-if="plugin.origin === 'core'"
            class="verified material-icons"
          >verified_user</i>
        </div>
      </div>
      <div class="actions">
        <x-button
          v-if="plugin.installed && plugin.updateAvailable"
          class="btn btn-small btn-flat"
          :disabled="plugin.disabled || plugin.installing"
          :title="upsell(plugin) ? 'Upgrade required' : ''"
          @click.prevent.stop="$emit('update', plugin)"
        >
          <x-label>
            {{ plugin.installing ? "Updating..." : "Update" }}
          </x-label>
        </x-button>
        <x-button
          v-if="!plugin.installed"
          class="btn btn-small btn-flat"
          :disabled="plugin.disabled || plugin.installing"
          :title="upsell(plugin) ? 'Upgrade required' : ''"
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
import type { UIPlugin } from "@/services/plugin/types";

export default Vue.extend({
  name: "PluginList",
  props: {
    plugins: {
      type: Array as PropType<UIPlugin[]>,
      required: true,
    },
  },
  methods: {
    handleItemClick(_event: MouseEvent, plugin: UIPlugin) {
      this.$emit("item-click", plugin);
    },
    upsell(plugin: UIPlugin) {
      return plugin.disabled
        && plugin.disableReasons.find((r) => r.source === "license");
    },
  },
});
</script>

<style scoped>
.status-error {
  line-height: 1.5;
}

.description {
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  line-clamp: 2;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.plugin-list .item {
  position: relative;
}

.upgrade-required-icon {
  color: var(--theme-primary);
}

.title {
  display: flex;
  align-items: center;
  gap: 0.5ch;

  .badge {
    margin: 0;
  }
}

.author {
  display: flex;
  align-items: center;
  gap: 0.5ch;

  .verified {
    color: var(--theme-secondary);
    font-size: 1em;
  }
}
</style>
