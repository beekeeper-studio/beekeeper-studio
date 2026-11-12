<template>
  <div
    class="item"
    :class="{'disabled': source.disabled }"
    tabindex="0"
    @click.prevent="emit('item-click', source)"
  >
    <div class="info">
      <div class="title">
        <span v-if="isSearching" v-html="source.name" />
        <span v-else>{{ source.name }}</span>
        <span
          class="badge origin-badge"
          :class="`origin-${source.origin}`"
        >{{ originLabel(source.origin) }}</span>
        <span class="badge" v-if="source.disabled">disabled</span>
        <loading-spinner v-if="source.checkingForUpdates || source.installing" />
      </div>
      <div class="status-error" v-if="!source.loadable && source.installed">
        This plugin requires version {{ source.minAppVersion }} or newer.
      </div>
      <div class="status-error" v-if="source.error" style="white-space: pre-wrap;">
        <template v-if="source.error.toString?.().includes('not compatible')">
          {{ source.error.toString().split("Please upgrade")[0] }}
        </template>
        <template v-else>
          {{ source.error }}
        </template>
      </div>
      <div class="description">
        {{ source.description }}
      </div>
      <div class="author">
        <img
          v-if="avatarUrl(source) && !brokenAvatars.includes(source.id)"
          class="author-avatar"
          :src="avatarUrl(source)"
          alt=""
          @error="markAsBrokenAvatar(source.id)"
        >
        {{ source.author.name || source.author }}
        <i
          class="material-icons verified-icon"
          v-if="source.origin === 'official'"
        >verified</i>
      </div>
    </div>
    <div class="actions">
      <x-button
        v-if="source.installed && source.updateAvailable"
        class="btn btn-flat"
        :disabled="source.installing"
        @click.prevent.stop="emit('update', source)"
      >
        <x-label>
          {{ source.installing ? "Updating..." : "Update" }}
        </x-label>
      </x-button>
      <x-button
        v-if="!source.installed"
        class="btn btn-flat"
        :disabled="source.installing"
        @click.prevent.stop="emit('install', source)"
      >
        <x-label>
          {{ source.installing ? "Installing..." : "Install" }}
        </x-label>
      </x-button>
      <x-button
        @click.stop
        class="menu-btn btn btn-icon"
        v-if="source.installed"
      >
        <i class="material-icons">more_vert</i>
        <x-menu>
          <x-menuitem @click.prevent="emit('item-click', source)">
            <x-label>View</x-label>
          </x-menuitem>
          <x-menuitem v-if="!$bksConfig.pluginSystem.disabled" @click.prevent="emit('checkForUpdates', source)" :disabled="source.checkingForUpdates">
            <x-label>Check for updates</x-label>
          </x-menuitem>
          <x-menuitem v-if="!$bksConfig.pluginSystem.disabled" @click.prevent="emit('uninstall', source)">
            <x-label> Uninstall </x-label>
          </x-menuitem>
        </x-menu>
      </x-button>
    </div>
  </div>
</template>

<script lang="ts">
import Vue, { PropType } from "vue";
import LoadingSpinner from "@/components/common/loading/LoadingSpinner.vue";
import type { ExtensionUI, ExtensionOrigin } from "@/services/plugin/types";
import { getPluginAvatarUrl } from "@/services/plugin/utils";
import _ from "lodash";

export default Vue.extend({
  components: { LoadingSpinner },
  props: {
    source: {
      type: Object as PropType<ExtensionUI>
    },
    isSearching: {
      type: Boolean,
      default: false
    },
    brokenAvatars: {
      type: Array as PropType<string[]>
    },
    emit: {
      type: Function
    },
    markAsBrokenAvatar: {
      type: Function
    }
  },
  methods: {
    originLabel(origin: ExtensionOrigin) {
      return _.upperFirst(origin);
    },
    avatarUrl(plugin: ExtensionUI) {
      return getPluginAvatarUrl(plugin);
    },
  }
})

</script>

<style lang="scss" scoped>
@import '../../shared/assets/styles/_variables';

.material-icons.verified-icon {
  font-size: 1em;
  color: var(--primary-text);
  margin-left: 0.5ch;
}

.badge {
  vertical-align: middle;
  text-transform: none;

  &:not(.origin-badge) {
    margin-left: 0;
  }
}

.badge.origin-badge.origin-official {
  background: var(--primary-text);
  color: var(--primary-contrast);
}

.author-avatar {
  width: 1.25em;
  height: 1.25em;
  border-radius: 50%;
  margin-right: 0.5ch;
  flex-shrink: 0;
  object-fit: cover;
}


.item {
  padding: 0.75rem 0.5rem;
  font-size: $form-control-font-size;
  line-height: 1.5;
  border-radius: 0.375rem;
  display: flex;
  place-content: space-between;
  gap: 1rem;
  cursor: pointer;

  &:hover {
    background-color: var(--bg-hover);
  }

  &:focus-visible {
    outline-style: solid;
    outline-offset: 0.14rem;
    outline-width: 1px;
    outline-color: var(--text-contrast);
  }

  &.disabled .info {
    opacity: 0.75;
  }

  .info {
    display: flex;
    flex-direction: column;

    .title {
      font-weight: 700;
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.5ch;
      color: var(--text-contrast);
    }

    .title :deep(.spinner) {
      padding: 0;
      min-width: 0;
      margin-block: -4px;
    }

    .author {
      display: flex;
      align-items: center;
      color: var(--text);
    }

    .status-error {
      color: var(--danger-text);
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }
  }

  .actions {
    display: flex;
    gap: 1rem;
  }
}
</style>
