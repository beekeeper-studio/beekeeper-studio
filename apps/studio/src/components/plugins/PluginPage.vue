<template>
  <div class="plugin-page-container">
    <div class="header">
      <div class="title">
        <span>{{ plugin.name }}</span>
        <span v-if="plugin.installed" class="version">{{ plugin.installedVersion }}</span>
      </div>
      <div class="author">
        <span>By</span>
        <a
          v-if="typeof plugin.author !== 'string'"
          :href="plugin.author.url"
        >{{ plugin.author.name }}</a>
        <span v-else>{{ plugin.author }}</span>
        <i v-if="plugin.origin === 'core'" class="verified material-icons">verified_user</i>
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
            :disabled="plugin.disabled || plugin.checkingForUpdates"
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
            :disabled="plugin.disabled || plugin.checkingForUpdates"
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
              :disabled="plugin.disabled"
              @change="toggleAutoUpdate"
            />
            <span>Auto-update</span>
          </label>
        </template>
        <x-button
          v-else
          @click.prevent="$emit('install')"
          class="btn btn-primary"
          :disabled="plugin.disabled || plugin.installing"
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
      <template v-if="plugin.disabled">
        <DisabledPluginAlert
          v-for="reason of plugin.disableReasons"
          :plugin-name="plugin.name"
          :reason="reason"
        />
      </template>
      <div class="alert alert-danger" v-if="!plugin.compatible && plugin.installed">
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
      <div class="not-available" v-else>
        Readme is not available
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Vue, { PropType } from "vue";
import DOMPurify from "dompurify";
import { marked } from "marked";
import { UIPlugin } from "@/services/plugin";
import DisabledPluginAlert from "./DisabledPluginAlert.vue";

export default Vue.extend({
  name: "PluginPage",
  components: {
    DisabledPluginAlert,
  },
  props: {
    plugin: {
      type: Object as PropType<UIPlugin>,
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

.author {
  display: flex;
  gap: 0.5ch;

  .verified {
    color: var(--theme-secondary);
    font-size: 1em;
  }
}

.checkbox-group:has(input:disabled) {
  color: var(--text-light);

  input {
    background-color: var(--text-lighter);
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
