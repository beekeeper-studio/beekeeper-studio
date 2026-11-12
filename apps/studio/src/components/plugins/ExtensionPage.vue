<template>
  <div class="extension-page-container">
    <div class="header">
      <div class="identity">
        <div class="identity-text">
          <div class="title">
            {{ extension.name }} <span class="version" v-if="extension?.version != null">v{{ extension.version }}</span>
            <span class="badge" v-if="extension.origin === 'unlisted'">Unlisted</span>
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
            <template v-if="extension.author?.name && extension.author?.url">
              <a :href="extension.author.url">{{ extension.author.name }}</a>
            </template>
            <template v-else>
              {{ extension.author }}
            </template>
            <i
              class="material-icons verified-icon"
              v-if="extension.origin === 'official'"
            >verified</i>
            <span
              v-if="extensionRepo?.downloadCount != null"
              class="downloads"
              :title="$pluralize('download', extensionRepo.downloadCount, true)"
            >
              <i class="material-icons">download</i>
              <span>{{ extensionRepo.downloadCount }}</span>
            </span>
          </div>
        </div>
      </div>
      <a v-if="extension.repo" :href="`https://github.com/${extension.repo}`">
        <span class="flex">
          <i class="material-icons">link</i>
          <span>&nbsp;</span>
          <span>{{ extension.repo }}</span>
        </span>
      </a>
      <div class="description">
        {{ extension.description }}
      </div>
      <div
        class="actions"
        v-if="extension.repo || extension.installed"
      >
        <template v-if="extension.installed">
          <x-button
            v-if="extension.repo && extension.updateAvailable"
            @click.prevent="$emit('update')"
            class="btn btn-primary"
          >
            <x-label>
              {{
                extension.installing ? "Updating..." : "Update"
              }}
            </x-label>
          </x-button>
          <x-button
            v-else-if="extension.repo"
            @click.prevent="$emit('checkForUpdates')"
            class="btn btn-flat"
            :disabled="extension.checkingForUpdates"
          >
            <x-label>Check for Updates</x-label>
          </x-button>
          <x-button @click.prevent="$emit('uninstall')" class="btn btn-flat">
            <x-label>Uninstall</x-label>
          </x-button>
          <slot name="settings" />
        </template>
        <x-button
          v-else
          @click.prevent="$emit('install')"
          class="btn btn-primary"
          :disabled="extension.installing"
        >
          <x-label>
            {{
              extension.installing ? "Installing..." : "Install"
            }}
          </x-label>
        </x-button>
      </div>
      <div
        v-if="
          !extension.checkingForUpdates && extension.checkingForUpdates !== null
        "
        class="update-indicator"
      >
        {{ extension.updateAvailable ? "Update Available!" : "Up to date!" }}
      </div>
      <disable-state-alert :id="extension.id" :type="type" />
      <div
        class="alert alert-danger"
        v-if="!extension.loadable && extension.installed"
      >
        <i class="material-icons">error_outline</i>
        <div class="alert-body expand">
          <span>This plugin was not loaded because it requires Beekeeper Studio {{ extension.minAppVersion }}+. Please upgrade the app or <a href="https://docs.beekeeperstudio.io/user_guide/plugins/#installing-a-specific-plugin-version">install a compatible plugin version</a>.</span>
        </div>
      </div>
      <div class="alert alert-danger" v-if="extension.error">
        <i class="material-icons">error_outline</i>
        <div class="alert-body expand" style="white-space: pre-wrap;">
          <span v-if="extension.error.toString?.().includes('not compatible')">
            {{ extension.error }}
            Or <a href="https://docs.beekeeperstudio.io/user_guide/plugins/#installing-a-specific-plugin-version">install</a> a compatible plugin version.
          </span>
          <span v-else>{{ extension.error }}</span>
        </div>
      </div>
    </div>
    <div class="divider" v-if="rawHtmlContent" />
    <div class="markdown-content">
      <div v-if="loadingMarkdown" class="loading">
        Loading readme
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
import { ExtensionRepository, ExtensionUI } from "@/services/plugin/types";
import DisableStateAlert from "./DisableStateAlert.vue";

export default Vue.extend({
  name: "ExtensionPage",
  components: { DisableStateAlert },
  props: {
    type: {
      type: String as PropType<"plugin" | "theme">,
      required: true,
    },
    extension: {
      type: Object as PropType<ExtensionUI>,
      required: true,
    },
    extensionRepo: Object as PropType<ExtensionRepository>,
    loadingMarkdown: Boolean,
  },
  data() {
    return {
      avatarBroken: false,
    };
  },
  watch: {
    "extension.id": function () {
      this.avatarBroken = false;
    },
  },
  computed: {
    avatarUrl() {
      return getPluginAvatarUrl(this.extension, 160);
    },
    rawHtmlContent() {
      if (!this.extensionRepo?.readme) return "";
      const marked = new Marked()
        .use(markedAlert())
        .use(markedVideoEmbed);

      if (this.extension.repo) {
        marked.use({ walkTokens: markedRepoUrlRewriter(this.extension.repo) });
      }

      return DOMPurify.sanitize(marked.parse(this.extensionRepo?.readme, { async: false, gfm: true, breaks: true }));
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

.extension-page-container {
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

  .alert {
    margin: 0;
    margin-top: 0.5rem;
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
        border-radius: 0 var(--alert-border-radius) var(--alert-border-radius) 0;
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
