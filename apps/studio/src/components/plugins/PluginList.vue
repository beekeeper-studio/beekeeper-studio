<template>
  <div class="plugin-list-wrap">
    <div class="fixed">
      <div class="filter">
        <div class="filter-wrap">
          <input
            class="filter-input"
            type="text"
            placeholder="Search Plugins"
            v-model="searchQuery"
          >
          <x-buttons class="filter-actions">
            <x-button
              v-if="searchQuery"
              @click="clearFilter"
              class="btn btn-fab btn-link action-item"
            >
              <i class="clear material-icons">cancel</i>
            </x-button>

            <x-button
              class="btn btn-fab btn-link action-item"
              :class="{ active: pluginsHidden }"
              @click="openFilterMenu"
              menu
            >
              <i class="material-icons-outlined">filter_alt</i>
              <x-menu>
                <label v-if="canFilterOfficial">
                  <input
                    type="checkbox"
                    v-model="pluginFilter.showOfficial"
                  >
                  <span>Official</span>
                </label>
                <label v-if="canFilterCommunity">
                  <input
                    type="checkbox"
                    v-model="pluginFilter.showCommunity"
                  >
                  <span>Community</span>
                </label>
                <label v-if="canFilterCustom">
                  <input
                    type="checkbox"
                    v-model="pluginFilter.showCustom"
                  >
                  <span>Custom</span>
                </label>
                <x-menuitem />
                <label v-if="canFilterUnlisted">
                  <input
                    type="checkbox"
                    v-model="pluginFilter.showUnlisted"
                  >
                  <span>Unlisted</span>
                </label>
                <label v-if="canFilterUnlisted">
                  <input
                    type="checkbox"
                    v-model="pluginFilter.showUnlisted"
                  >
                  <span>Unlisted</span>
                </label>
                <x-menuitem />
              </x-menu>
            </x-button>
          </x-buttons>
        </div>
      </div>
    </div>
    <ul class="plugin-list">
      <li
        v-for="plugin in filteredPlugins"
        :key="plugin.id"
        class="item"
        tabindex="0"
        @click.prevent="handleItemClick($event, plugin)"
      >
        <div class="info">
          <div class="title">
            <span v-if="!!searchQuery" v-html="plugin.name"></span>
            <span v-else>{{ plugin.name }}</span>
            <span
              class="badge origin-badge"
              :class="`origin-${plugin.origin}`"
            >{{ originLabel(plugin.origin) }}</span>
            <span class="badge" v-if="snapshotsById[plugin.id]?.disableState.disabled">disabled</span>
            <loading-spinner v-if="plugin.checkingForUpdates || plugin.installing" />
          </div>
          <div class="status-error" v-if="!plugin.loadable && plugin.installed">
            This plugin requires version {{ plugin.minAppVersion }} or newer.
          </div>
          <div class="status-error" v-if="plugin.error" style="white-space: pre-wrap;">
            <template v-if="plugin.error.toString?.().includes('not compatible')">
              {{ plugin.error.toString().split("Please upgrade")[0] }}
            </template>
            <template v-else>
              {{ plugin.error }}
            </template>
          </div>
          <div class="description">
            {{ plugin.description }}
          </div>
          <div class="author">
            <img
              v-if="avatarUrl(plugin) && !brokenAvatars.includes(plugin.id)"
              class="author-avatar"
              :src="avatarUrl(plugin)"
              alt=""
              @error="brokenAvatars.push(plugin.id)"
            >
            {{ plugin.author.name || plugin.author }}
            <i
              class="material-icons verified-icon"
              v-if="plugin.origin === 'official'"
            >verified</i>
          </div>
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
              <x-menuitem v-if="!$bksConfig.pluginSystem.disabled" @click.prevent="$emit('checkForUpdates', plugin)" :disabled="plugin.checkingForUpdates">
                <x-label>Check for updates</x-label>
              </x-menuitem>
              <x-menuitem v-if="!$bksConfig.pluginSystem.disabled" @click.prevent="$emit('uninstall', plugin)">
                <x-label> Uninstall </x-label>
              </x-menuitem>
            </x-menu>
          </x-button>
        </div>
      </li>
    </ul>
  </div>
</template>

<script lang="ts">
import Vue, { PropType } from "vue";
import LoadingSpinner from "@/components/common/loading/LoadingSpinner.vue";
import type { Plugin, PluginOrigin } from "@/services/plugin/types";
import { getPluginAvatarUrl } from "@/services/plugin/utils";
import { mapGetters } from "vuex";
import _ from "lodash";
import { openMenu } from "@beekeeperstudio/ui-kit";
import uFuzzy from "@leeoniya/ufuzzy";
import { escapeHtml } from "@/shared/lib/tabulator";

const uf = new uFuzzy({
  intraMode: 0,
  intraIns: Infinity
});

export default Vue.extend({
  name: "PluginList",
  components: { LoadingSpinner },
  props: {
    plugins: {
      type: Array as PropType<Plugin[]>,
      required: true,
    },
  },
  data() {
    return {
      // we do this so we don't continuously try bad urls
      brokenAvatars: [] as string[],
      searchQuery: null,
      pluginFilter: {
        showOfficial: true,
        showCommunity: true,
        showCustom: true,
        showUnlisted: true,
      }
    };
  },
  computed: {
    ...mapGetters("plugins/snapshots", ["snapshotsById"]),
    canFilterOfficial() {
      return !this.$bksConfig.pluginSystem.officialDisabled;
    },
    canFilterCommunity() {
      return !this.$bksConfig.pluginSystem.communityDisabled && this.hasCommunity;
    },
    canFilterCustom() {
      return !this.$bksConfig.pluginSystem.thirdPartyRegistriesDisabled && this.hasCustom;
    },
    canFilterUnlisted() {
      return !this.$bksConfig.pluginSystem.unlistedDisabled && this.hasUnlisted;
    },
    pluginsHidden() {
      return !this.pluginFilter.showOfficial ||
        !this.pluginFilter.showCommunity ||
        !this.pluginFilter.showCustom ||
        !this.pluginFilter.showUnlisted;
    },
    hasCommunity() {
      return this.plugins.some((p: Plugin) => p.origin === 'community');
    },
    hasCustom() {
      return this.plugins.some((p: Plugin) => p.origin === 'custom');
    },
    hasUnlisted() {
      return this.plugins.some((p: Plugin) => p.origin === 'unlisted');
    },
    originFilter() {
      const filter: PluginOrigin[] = [];

      if (this.pluginFilter.showOfficial) {
        filter.push("official");
      }

      if (this.pluginFilter.showCommunity) {
        filter.push("community");
      }

      if (this.pluginFilter.showCustom) {
        filter.push("custom");
      }

      if (this.pluginFilter.showUnlisted) {
        filter.push("unlisted");
      }

      return filter;
    },
    filteredPlugins() {
      const plugins = this.plugins.filter((p: Plugin) => this.originFilter.includes(p.origin));
      if (!this.searchQuery) {
        return plugins;
      }

      const names = plugins.map((p: Plugin) => p.name);
      const [idxs, info, order] = uf.search(names, this.searchQuery, 0, Infinity)

      if (!idxs || !info || !order) {
        return [];
      }

      const results: Plugin[] = [];
      for (let i = 0; i < order.length; i++) {
        const infoIdx = order[i];
        const itemIdx = idxs[infoIdx];
        const plugin = plugins[itemIdx];

        const highlight = uFuzzy.highlight(
          names[info.idx[infoIdx]],
          info.ranges[infoIdx],
          (part, matched) =>
            matched
              ? `<strong>${escapeHtml(part) ?? ""}</strong>`
              : escapeHtml(part) ?? ""
        );

        results.push({
          ...plugin,
          name: highlight
        })
      }


      return results;
    }
  },
  methods: {
    clearFilter() {
      this.searchQuery = null;
    },
    originLabel(origin: PluginOrigin) {
      return _.upperFirst(origin);
    },
    avatarUrl(plugin: Plugin) {
      return getPluginAvatarUrl(plugin);
    },
    handleItemClick(_event: MouseEvent, plugin: Plugin) {
      this.$emit("item-click", plugin);
    },
    openFilterMenu(event: MouseEvent) {
      openMenu({ event, options: this.filterMenuOptions})
    }
  },
});
</script>

<style lang="scss" scoped>
@import '../../shared/assets/styles/_variables';

.material-icons.verified-icon {
  font-size: 1em;
  color: var(--theme-secondary);
  margin-left: 0.5ch;
}

.badge.origin-badge {
  font-size: 0.75rem;
  vertical-align: middle;
  text-transform: none;
}

.badge.origin-badge.origin-official {
  background: var(--theme-secondary);
  color: rgba(0, 0, 0, 0.87);
}

.author-avatar {
  width: 1.25em;
  height: 1.25em;
  border-radius: 50%;
  margin-right: 0.5ch;
  flex-shrink: 0;
  object-fit: cover;
}

.plugin-list {
  list-style-type: none;
  padding: 0 0 0.5rem;
  margin: 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  min-width: 400px;

  .item {
    padding: 1rem $gutter-h;
    border-radius: 0.375rem;
    display: flex;
    place-content: space-between;
    gap: 1rem;
    cursor: pointer;

    &:hover {
      background-color: rgba($theme-base, 0.02);
    }

    &:focus-visible {
      outline-style: solid;
      outline-offset: 0.14rem;
      outline-width: 1px;
      outline-color: $theme-base;
    }

    .info {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;

      .description {
        line-height: 1.5rem;
      }

      .title {
        font-weight: 700;
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 0.5ch;
      }

      .title :deep(.spinner) {
        padding: 0;
        min-width: 0;
        margin-block: -4px;
      }

      .author {
        display: flex;
        align-items: center;
        font-size: 0.875rem;
        color: rgba($theme-base, 0.7);
      }

      .status-error {
        font-size: 0.875rem;
        color: $brand-danger;
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
}

.filter {
  position: relative;
  margin-bottom: $gutter-h;
  .filter-wrap {
    position: relative;
    display: flex;
    align-items: center;
    border: 1px solid $border-color;
    border-radius: 4px;
  }
  .filter-input {
    border: 0;
    padding-right: 0;
  }
  .filter-actions {
    display: inline-flex;
    padding: 0 0 0 ($gutter-h * 0.5);
    x-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      background: transparent;
      box-shadow: none;
      width: 26px;
      cursor: pointer;
      --trigger-effect: none;
      &:before {
        display: none!important;
      }
      &:hover, &:focus {
        box-shadow: none;
        .material-icons, .material-icons-outlined {
          color: $text-dark;
        }
      }
      &.btn-fab {
        margin-right: 2px;
        line-height: 22px;
        height: 22px;
        width: 22px;
        min-width: 22px;
        border-radius: 22px;
        border: 0;
        &.active {
          background: rgba($theme-base, 0.1);
          .material-icons {
            color: $theme-primary;
          }
        }

      }
    }
    x-menu {
      padding: $gutter-h 0;
      label {
        display: flex;
        justify-content: flex-start;
        align-items: center;
        padding: 0 $gutter-w;
        min-height: $input-height;
        cursor: pointer;
      }
      x-menuitem {
        display: none;
      }
    }
    .material-icons, .material-icons-outlined {
      font-size: 14px;
      line-height: 26px;
      width: 14px;
      color: rgba($theme-base, 0.5);
    }
  }
}
</style>
