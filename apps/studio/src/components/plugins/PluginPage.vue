<template>
  <div class="plugin-page-container">
    <div class="header">
      <div class="title">
        <span>{{ plugin.name }}</span>
        <i class="material-icons" v-if="isCommunity && plugin.id.startsWith('bks-')">stars</i>
        <span class="version">{{ plugin.version }}</span>
      </div>
      <div>
        By
        <template v-if="plugin.author.name && plugin.author.url">
          <a :href="plugin.author.url">{{ plugin.author.name }}</a>
        </template>
        <template v-else>{{ plugin.author }}</template>
      </div>
      <a v-if="plugin.repo" :href="`https://github.com/${plugin.repo}`">
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
            :disabled="isCommunity && plugin.id.startsWith('bks-')"
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
          :disabled="(isCommunity && plugin.id.startsWith('bks-')) || plugin.installing"
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
      <div class="alert" v-if="plugin.disabled">
        <i class="material-icons">info_outline</i>
        <div>
          {{
          $bksConfig.plugins?.[plugin.id]?.disabled
            ? "This plugin has been disabled via configuration"
            : "[TODO]This plugin has been disabled due to license restriction"
          }}
        </div>
      </div>
      <div class="alert alert-danger" v-if="!plugin.loadable && plugin.installed">
        <i class="material-icons">error_outline</i>
        <div class="alert-body expand">
          <span>This plugin was not loaded because it requires Beekeeper Studio {{ plugin.minAppVersion }}+. Please upgrade the app or <a href="https://docs.beekeeperstudio.io/user_guide/plugins/#installing-a-specific-plugin-version">install a compatible plugin version</a>.</span>
        </div>
      </div>
      <div class="alert alert-danger" v-if="plugin.error">
        <i class="material-icons">error_outline</i>
        <div class="alert-body expand" style="white-space: pre-wrap;">
          <span v-if="plugin.error.toString?.().includes('not compatible')">
            {{ plugin.error }}
            Or <a href="https://docs.beekeeperstudio.io/user_guide/plugins/#installing-a-specific-plugin-version">install</a> a compatible plugin version.
          </span>
          <span v-else>{{ plugin.error }}</span>
        </div>
      </div>
    </div>
    <div class="divider" />
    <div class="markdown-content">
      <div v-if="loadingMarkdown" class="loading">Loading plugin readme</div>
      <div v-if="rawHtmlContent" v-html="rawHtmlContent" />
      <div class="not-available" v-else="rawHtmlContent">
        Readme is not available
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import DOMPurify from "dompurify";
import { marked } from "marked";
import { mapGetters } from "vuex";

export default Vue.extend({
  name: "PluginPage",
  props: {
    plugin: {
      type: Object, // FIXME (azmi): forgot what type this is!!!
      required: true,
    },
    markdown: String,
    loadingMarkdown: Boolean,
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
    ...mapGetters(['isCommunity']),
    rawHtmlContent() {
      if (!this.markdown) return "";
      return DOMPurify.sanitize(marked.parse(this.markdown, { async: false }));
    },
  },
});
</script>

<style scoped>
.upgrade-required-icon {
  color: var(--theme-primary);
}

.not-available {
  margin-top: 0.5rem;
  color: var(--text);
  font-style: italic;
}

.title {
  display: flex;
  align-items: center;
  gap: 0.5ch;

  .version {
    align-self: flex-end;
  }
}

.loading {
  margin-top: 0.5rem;
  color: var(--text);
}

.loading::after {
  content: "...";
  animation: dots 1s steps(2) infinite;
}

@keyframes dots {
  0%   { content: "..."; }
  50%  { content: ".."; }
  100% { content: "..."; }
}
</style>
