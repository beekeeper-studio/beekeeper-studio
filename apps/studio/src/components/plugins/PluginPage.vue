<template>
  <div class="plugin-page-container">
    <div class="header">
      <div class="identity">
        <img
          v-if="avatarUrl && !avatarBroken"
          class="owner-avatar"
          :src="avatarUrl"
          alt=""
          @error="avatarBroken = true"
        >
        <div class="identity-text">
          <div class="title">
            {{ plugin.name }} <span class="version">{{ plugin.version }}</span>
          </div>
          <div class="author">
            By
            <template v-if="plugin.author.name && plugin.author.url">
              <a :href="plugin.author.url">{{ plugin.author.name }}</a>
            </template>
            <template v-else>
              {{ plugin.author }}
            </template>
            <i
              class="material-icons verified-icon"
              v-if="plugin.origin === 'official'"
            >verified</i>
          </div>
        </div>
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
      <div class="actions" v-if="plugin.repo && !$bksConfig.pluginSystem.disabled">
        <template v-if="plugin.installed">
          <x-button
            v-if="plugin.updateAvailable"
            @click.prevent="$emit('update')"
            class="btn btn-primary"
          >
            <x-label>
              {{
                plugin.installing ? "Updating..." : "Update"
              }}
            </x-label>
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
            >
            <span>Auto-update</span>
          </label>
        </template>
        <x-button
          v-else
          @click.prevent="$emit('install')"
          class="btn btn-primary"
          :disabled="plugin.installing"
        >
          <x-label>
            {{
              plugin.installing ? "Installing..." : "Install"
            }}
          </x-label>
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
      <DisableStateAlert :plugin-id="plugin.id" />
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
    <div class="divider" v-if="rawHtmlContent" />
    <div class="markdown-content">
      <div v-if="loadingMarkdown" class="loading">
        Loading plugin readme
      </div>
      <div v-html="rawHtmlContent" />
    </div>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import DOMPurify from "dompurify";
import { marked } from "marked";
import { getPluginAvatarUrl } from "@/services/plugin/utils";
import DisableStateAlert from "./DisableStateAlert.vue";

export default Vue.extend({
  name: "PluginPage",
  components: {
    DisableStateAlert,
  },
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
      avatarBroken: false,
    };
  },
  async mounted() {
    await this.getAutoUpdateSetting();
  },
  watch: {
    "plugin.id": async function () {
      this.avatarBroken = false;
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
    avatarUrl() {
      return getPluginAvatarUrl(this.plugin, 160);
    },
    rawHtmlContent() {
      if (!this.markdown) return "";
      return DOMPurify.sanitize(marked.parse(this.markdown, { async: false }));
    },
  },
});
</script>

<style lang="scss" scoped>
@import '../../assets/styles/app/_variables';

$gutter-h: 1.5rem;

.author {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.material-icons.verified-icon {
  font-size: 1em;
  color: var(--theme-secondary);
}

.identity {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.identity-text {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
}

.owner-avatar {
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  flex-shrink: 0;
  object-fit: cover;
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

.plugin-page-container {
  padding-inline: $gutter-h;
  overflow-y: auto;
  border-left: 1px solid rgba($theme-base, 0.1);
  flex-grow: 1;
  flex-basis: 65%;

  a:hover, a:hover * {
    &:not(:has(>*)):not(.material-icons) {
      text-decoration: underline;
    }
  }

  .header {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding-bottom: 1rem;

    .title {
      font-size: 1.5rem;
      font-weight: 700;

      .version {
        padding-left: 0.5rem;
        font-size: 0.6em;
        color: rgba($theme-base, 0.7);
      }
    }

    .description {
      color: rgba($theme-base, 0.7);
      line-height: 1.5;
    }

    .actions {
      margin-top: 0.5rem;
      display: flex;
      gap: 1rem;
      place-items: center;
    }

    .update-indicator {
      padding-top: 0.6rem;
      color: $brand-info;
      opacity: 0.8;
    }
  }

  .divider {
    width: 100%;
    border-bottom: 1px solid rgba($theme-base, 0.1);
  }

  .markdown-content {
    line-height: 1.625;
    padding-bottom: 1rem;

    pre {
      padding: 1rem;
      border-radius: 0.375rem;
      background-color: rgba($theme-base, 0.03);
      overflow: auto;
    }

    img {
      max-width: 100%;
      height: auto;
      -webkit-user-drag: none;
    }
  }
}
</style>
