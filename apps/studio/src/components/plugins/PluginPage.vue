<template>
  <div class="plugin-page-container">
    <div class="header">
      <div class="identity">
        <div class="identity-text">
          <div class="title">
            {{ plugin.name }} <span class="version" v-if="plugin?.version != null">v{{ plugin.version }}</span>
          </div>
          <div class="author">
            By
            <img
              v-if="avatarUrl && !avatarBroken"
              class="owner-avatar"
              :src="avatarUrl"
              alt=""
              @error="avatarBroken = true"
            >
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
            <span
              v-if="pluginRepo?.downloadCount != null"
              class="downloads"
              :title="$pluralize('download', pluginRepo.downloadCount, true)"
            >
              <i class="material-icons">download</i>
              <span>{{ pluginRepo.downloadCount }}</span>
            </span>
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
          <label class="checkbox-group">
            <input
              type="checkbox"
              :checked="pluginReadOnly"
              @change="toggleReadOnly"
            >
            <span>Read-Only</span>
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
import Vue, { PropType } from "vue";
import DOMPurify from "dompurify";
import { Marked } from "marked";
import markedAlert from "marked-alert";
import { getPluginAvatarUrl, markedRepoUrlRewriter, markedVideoEmbed } from "@/services/plugin/utils";
import DisableStateAlert from "./DisableStateAlert.vue";
import { PluginRepository, Plugin } from "@/services/plugin/types";

export default Vue.extend({
  name: "PluginPage",
  components: {
    DisableStateAlert,
  },
  props: {
    plugin: {
      type: Object as PropType<Plugin>,
      required: true,
    },
    pluginRepo: Object as PropType<PluginRepository>,
    loadingMarkdown: Boolean,
  },
  data() {
    return {
      autoUpdateEnabled: true,
      avatarBroken: false,
      pluginReadOnly: true
    };
  },
  async mounted() {
    await this.getAutoUpdateSetting();
    await this.getReadOnlySetting();
  },
  watch: {
    "plugin.id": async function () {
      this.avatarBroken = false;
      await this.getAutoUpdateSetting();
      await this.getReadOnlySetting();
    },
  },
  methods: {
    async getAutoUpdateSetting() {
      this.autoUpdateEnabled = await this.$util.send(
        "plugin/getPluginSetting",
        { id: this.plugin.id, key: 'autoUpdate' }
      );
    },
    async toggleAutoUpdate(event) {
      const enabled = event.target.checked;
      await this.$util.send("plugin/setPluginSetting", {
        id: this.plugin.id,
        key: 'autoUpdate',
        value: enabled,
      });
      this.autoUpdateEnabled = enabled;
    },
    async getReadOnlySetting() {
      this.pluginReadOnly = await this.$util.send(
        "plugin/getPluginSetting",
        { id: this.plugin.id, key: 'readOnly' }
      )
    },
    async toggleReadOnly(event) {
      const value = event.target.checked;
      await this.$util.send("plugin/setPluginSetting", {
        id: this.plugin.id,
        key: 'readOnly',
        value
      });
      this.pluginReadOnly = value;
    }
  },
  computed: {
    avatarUrl() {
      return getPluginAvatarUrl(this.plugin, 160);
    },
    rawHtmlContent() {
      if (!this.pluginRepo?.readme) return "";
      const marked = new Marked()
        .use(markedAlert())
        .use(markedVideoEmbed);

      if (this.plugin.repo) {
        marked.use({ walkTokens: markedRepoUrlRewriter(this.plugin.repo) });
      }

      return DOMPurify.sanitize(marked.parse(this.pluginRepo?.readme, { async: false, gfm: true, breaks: true }));
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
  color: var(--primary-text);
}

.downloads {
  display: inline-flex;
  align-items: center;
  gap: 0.15rem;
  opacity: 0.7;
  white-space: nowrap;

  > * {
    line-height: 1;
  }

  .material-icons {
    font-size: 1.15em;
  }
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
  width: 1.25rem;
  height: 1.25rem;
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
        color: var(--text);
      }
    }

    .description {
      color: var(--text);
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
      color: var(--info-text);
      opacity: 0.8;
    }
  }

  .divider {
    width: 100%;
    border-bottom: 1px solid var(--gray-a4);
  }

  .markdown-content {
    line-height: 1.625;
    padding-bottom: 1rem;

    ::v-deep {
      pre {
        padding: 1rem;
        border-radius: 0.375rem;
        background-color: var(--gray-a2);
        overflow: auto;
      }

      img {
        max-width: 100%;
        height: auto;
        -webkit-user-drag: none;
      }

      table {
        display: block;
        width: max-content;
        max-width: 100%;
        overflow: auto;
        margin: 1rem 0;
        border-collapse: collapse;
        border-spacing: 0;
      }

      th,
      td {
        padding: 0.375rem 0.8rem;
        border: 1px solid var(--border-subtle);
      }

      th {
        font-weight: 600;
        background-color: var(--table-header-highlight-bg);
      }

      tbody tr:nth-child(even) {
        background-color: var(--bg-subtle-a);
      }

      video {
        display: block;
        max-width: 100%;
        max-height: 640px;
        margin: 1rem 0;
        border-radius: 0.375rem;
      }

      .markdown-alert {
        --alert-color: var(--text);
        margin: 1rem 0;
        padding: 0.5rem 1rem;
        border-left: 3px solid var(--alert-color);
        border-radius: 0 6px 6px 0;
        background: var(--alert-bg);

        > :first-child { margin-top: 0; }
        > :last-child { margin-bottom: 0; }

        p {
          margin: 0.25rem 0;
        }
      }

      .markdown-alert-title {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.25rem;
        font-weight: 600;
        color: var(--alert-color);

        svg {
          fill: currentColor;
          flex-shrink: 0;
        }
      }

      .markdown-alert-note { --alert-color: var(--info-text); }
      .markdown-alert-tip { --alert-color: var(--success-text); }
      .markdown-alert-important { --alert-color: var(--purple-text); }
      .markdown-alert-warning { --alert-color: var(--warning-text); }
      .markdown-alert-caution { --alert-color: var(--danger-text); }
    }
  }
}
</style>
