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

    <div class="plugin-list">
      <virtual-plugin-list
        :raw-items="filteredPlugins"
        :isSearching="!!searchQuery"
        @install="$emit('install', $event)"
        @uninstall="$emit('uninstall', $event)"
        @update="$emit('update', $event)"
        @checkForUpdates="$emit('checkForUpdates', $event)"
        @item-click="$emit('item-click', $event)"
      />
    </div>
  </div>
</template>

<script lang="ts">
import Vue, { PropType } from "vue";
import VirtualPluginList from "./VirtualPluginList.vue";
import type { Plugin, PluginOrigin } from "@/services/plugin/types";
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
  components: { VirtualPluginList },
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
    openFilterMenu(event: MouseEvent) {
      openMenu({ event, options: this.filterMenuOptions})
    }
  },
});
</script>

<style lang="scss" scoped>
@import '../../shared/assets/styles/_variables';

.plugin-list-wrap {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
}

.plugin-list {
  list-style-type: none;
  padding: 0 0 0.5rem;
  margin: 0;
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  min-width: 400px;
}

.filter {
  position: relative;
  margin-bottom: $gutter-h;
  .filter-wrap {
    position: relative;
    display: flex;
    align-items: center;
    border: var(--input-border);
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
          color: var(--text-contrast);
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
          background: var(--gray-a4);
          .material-icons {
            color: var(--info-text);
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
      color: var(--text-muted);
    }
  }
}
</style>
