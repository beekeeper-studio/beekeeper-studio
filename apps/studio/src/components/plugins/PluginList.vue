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
        </div>
        <div class="description">
          {{ plugin.description }}
        </div>
        <div class="author">{{ plugin.author }}</div>
      </div>
      <x-button
        @click.stop
        class="menu-btn btn btn-fab"
        v-if="plugin.installed"
      >
        <i class="material-icons">more_vert</i>
        <x-menu>
          <x-menuitem>
            <x-label @click.prevent="$emit('uninstall', plugin)">
              Uninstall
            </x-label>
          </x-menuitem>
        </x-menu>
      </x-button>
      <x-button
        v-else
        class="btn btn-flat"
        :disabled="plugin.installing"
        @click.prevent.stop="$emit('install', plugin)"
      >
        <x-label>
          {{ plugin.installing ? "Installing..." : "Install" }}
        </x-label>
      </x-button>
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
