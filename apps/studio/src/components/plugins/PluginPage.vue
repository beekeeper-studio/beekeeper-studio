<template>
  <div class="plugin-page-container">
    <div class="header">
      <div class="title">
        {{ plugin.name }} <span class="version">{{ plugin.version }}</span>
      </div>
      <div>
        By
        <template v-if="plugin.author.name && plugin.author.url">
          <a :href="plugin.author.url">{{ plugin.author.name }}</a>
        </template>
        <template v-else>{{ plugin.author }}</template>
      </div>
      <a :href="`https://github.com/${plugin.repo}`">
        <span class="flex">
          <i class="material-icons">link</i>
          <span>&nbsp;</span>
          <span>{{ plugin.repo }}</span>
        </span>
      </a>
      <div class="description">
        {{ plugin.description }}
      </div>
      <div class="actions">
        <template v-if="plugin.installed">
          <x-button
            v-if="plugin.updateAvailable"
            @click.prevent="$emit('update')"
            class="btn btn-primary"
          >
            <x-label>{{
              plugin.installing ? "Updating..." : "Update"
            }}</x-label>
          </x-button>
          <x-button
            v-else
            @click.prevent="$emit('checkForUpdates')"
            class="btn btn-flat"
            :disabled="plugin.checkingForUpdates"
          >
            <x-label>Check for Updates</x-label>
          </x-button>
          <x-button @click.prevent="$emit('uninstall')" class="btn btn-flat">
            <x-label>Uninstall</x-label>
          </x-button>
          <label class="checkbox-group">
            <input
              type="checkbox"
              :checked="autoUpdateEnabled"
              @change="toggleAutoUpdate"
            />
            <span>Auto-update</span>
          </label>
        </template>
        <x-button
          v-else
          @click.prevent="$emit('install')"
          class="btn btn-primary"
          :disabled="plugin.installing"
        >
          <x-label>{{
            plugin.installing ? "Installing..." : "Install"
          }}</x-label>
        </x-button>
      </div>
      <div
        v-if="
          !plugin.checkingForUpdates && plugin.checkingForUpdates !== null
        "
        class="update-indicator"
      >
        {{ plugin.updateAvailable ? "Update Available!" : "Up to date!" }}
      </div>
      <div class="alert" v-if="$bksConfig.plugins?.[plugin.id]?.disabled">
        <i class="material-icons-outlined">info</i>
        <div>This plugin has been disabled via configuration</div>
      </div>
    </div>
    <div class="markdown-content">
      <div v-html="rawHtmlContent" />
    </div>
  </div>
</template>

<script lang="ts">
import Vue, { PropType } from "vue";
import DOMPurify from "dompurify";
import { CommonPluginInfo } from "@/services/plugin/types";
import { marked } from "marked";

export default Vue.extend({
  name: "PluginPage",
  props: {
    plugin: {
      type: Object as PropType<CommonPluginInfo>,
      required: true,
    },
    markdown: {
      type: String,
    },
  },
  data() {
    return {
      autoUpdateEnabled: true,
    };
  },
  async mounted() {
    await this.getAutoUpdateSetting();
  },
  watch: {
    "plugin.id": async function () {
      await this.getAutoUpdateSetting();
    },
  },
  methods: {
    async getAutoUpdateSetting() {
      this.autoUpdateEnabled = await this.$util.send(
        "plugin/getAutoUpdateEnabled",
        { id: this.plugin.id }
      );
    },
    async toggleAutoUpdate(event) {
      const enabled = event.target.checked;
      await this.$util.send("plugin/setAutoUpdateEnabled", {
        id: this.plugin.id,
        enabled,
      });
      this.autoUpdateEnabled = enabled;
    },
  },
  computed: {
    rawHtmlContent() {
      if (!this.markdown) return "";
      return DOMPurify.sanitize(marked.parse(this.markdown, { async: false }));
    },
  },
});
</script>
