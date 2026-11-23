<template>
  <virtual-list
    class="plugin-list"
    data-key="id"
    :data-sources="filteredPlugins"
    :data-component="itemComponent"
    :estimate-size="80"
    header-class="plugin-list-header"
    :header-style="{ top: `-${introHeight}px` }"
    :extra-props="{
      isSearching: !!searchQuery,
      brokenAvatars,
      emit: emitItemEvent,
      markAsBrokenAvatar,
    }"
  >
    <template #header>
      <div ref="intro">
        <slot name="header" />
      </div>
      <hgroup class="sticky-header" v-if="$slots['sticky-header']">
        <slot name="sticky-header" />
      </hgroup>
      <div class="filter">
        <div class="filter-wrap">
          <input
            class="filter-input"
            type="text"
            :placeholder="searchPlaceholder"
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
              v-if="canFilter"
              class="btn btn-fab btn-link action-item"
              :class="{ active: pluginsHidden }"
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
                <x-menuitem />
              </x-menu>
            </x-button>
          </x-buttons>
        </div>
      </div>
    </template>
    <template #footer>
      <div
        v-if="filteredPlugins.length === 0"
        class="empty-state"
      >
        <i class="material-icons-outlined">
          {{ searchQuery ? "search_off" : "inventory_2" }}
        </i>
        <span v-if="searchQuery">No results for "{{ searchQuery }}"</span>
        <span v-else>It's quiet in here</span>
      </div>
    </template>
  </virtual-list>
</template>

<script lang="ts">
import Vue, { PropType } from "vue";
import VirtualList from "vue-virtual-scroll-list";
import PluginItem from "./PluginItem.vue";
import type { ExtensionUI, ExtensionOrigin } from "@/services/plugin/types";
import { mapGetters } from "vuex";
import _ from "lodash";
import uFuzzy from "@leeoniya/ufuzzy";
import { escapeHtml } from "@/shared/lib/tabulator";

const uf = new uFuzzy({
  intraMode: 0,
  intraIns: Infinity
});

export default Vue.extend({
  name: "PluginList",
  components: { VirtualList },
  props: {
    plugins: {
      type: Array as PropType<ExtensionUI[]>,
      required: true,
    },
    searchPlaceholder: {
      type: String,
      default: "Search Plugins",
    },
    type: {
      type: String as PropType<"plugin" | "theme">,
      default: "plugin",
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
      },
      itemComponent: PluginItem,
      introHeight: 0,
      introObserver: null as ResizeObserver | null,
    };
  },
  computed: {
    ...mapGetters("plugins/snapshots", ["snapshotsById"]),
    systemConfig() {
      return this.type === "theme" ? this.$bksConfig.themeSystem : this.$bksConfig.pluginSystem;
    },
    canFilter() {
      return this.canFilterOfficial || this.canFilterCommunity || this.canFilterCustom || this.canFilterUnlisted;
    },
    canFilterOfficial() {
      return !this.systemConfig.officialDisabled && this.hasOfficial;
    },
    canFilterCommunity() {
      return !this.systemConfig.communityDisabled && this.hasCommunity;
    },
    canFilterCustom() {
      return !this.systemConfig.thirdPartyRegistriesDisabled && this.hasCustom;
    },
    canFilterUnlisted() {
      return !this.systemConfig.unlistedDisabled && this.hasUnlisted;
    },
    pluginsHidden() {
      return !this.pluginFilter.showOfficial ||
        !this.pluginFilter.showCommunity ||
        !this.pluginFilter.showCustom ||
        !this.pluginFilter.showUnlisted;
    },
    hasOfficial() {
      return this.plugins.some((p: ExtensionUI) => p.origin === 'official');
    },
    hasCommunity() {
      return this.plugins.some((p: ExtensionUI) => p.origin === 'community');
    },
    hasCustom() {
      return this.plugins.some((p: ExtensionUI) => p.origin === 'custom');
    },
    hasUnlisted() {
      return this.plugins.some((p: ExtensionUI) => p.origin === 'unlisted');
    },
    originFilter() {
      const filter: ExtensionOrigin[] = [];

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
      const plugins: ExtensionUI[] = this.plugins.filter((p: ExtensionUI) => this.originFilter.includes(p.origin));
      if (!this.searchQuery) {
        return plugins;
      }

      const names = plugins.map((p: ExtensionUI) => p.name);
      const [idxs, info, order] = uf.search(names, this.searchQuery, 0, Infinity)

      if (!idxs || !info || !order) {
        return [];
      }

      const results: ExtensionUI[] = [];
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
  mounted() {
    this.introObserver = new ResizeObserver(this.updateIntroHeight);
    this.introObserver.observe(this.$refs.intro as HTMLElement);
  },
  beforeDestroy() {
    this.introObserver.disconnect();
  },
  methods: {
    updateIntroHeight() {
      this.introHeight = (this.$refs.intro as HTMLElement).offsetHeight;
    },
    emitItemEvent(eventName: string, plugin: ExtensionUI) {
      this.$emit(eventName, plugin);
    },
    markAsBrokenAvatar(id: string) {
      this.brokenAvatars.push(id);
    },
    clearFilter() {
      this.searchQuery = null;
    },
  },
});
</script>

<style lang="scss" scoped>
.plugin-list {
  height: 100%;
  min-height: 0;
  min-width: 400px;
  overflow-y: auto;
}

// Negative top lets the slotted intro scroll away while the search bar sticks
.plugin-list ::v-deep .plugin-list-header {
  position: sticky;
  z-index: 1;
  padding-bottom: 0.25rem;
  background: var(--panel-bg);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  flex: 1 1 auto;
  padding: 2rem 0;
  color: var(--text-muted);

  .material-icons-outlined {
    font-size: 2.5rem;
  }
}

.filter {
  position: relative;
  margin-bottom: 0.4rem;
  padding-inline: 0.5rem;
  .filter-wrap {
    position: relative;
    display: flex;
    align-items: center;
    border: var(--input-border);
    border-radius: var(--input-border-radius);
  }
  .filter-input {
    border: 0;
    padding-right: 0;
  }
  .filter-actions {
    display: inline-flex;
    padding: 0 0 0 0.2rem;
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
      padding: 0.4rem 0;
      label {
        display: flex;
        justify-content: flex-start;
        align-items: center;
        padding: 0 0.8rem;
        min-height: 26px;
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

hgroup.sticky-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-inline: 0.5rem;
  height: 2.5rem;

  &::v-deep {
    h1, h2, h3, h4, h5, h6 {
      margin: 0;
      padding: 0;
    }

    .btn-icon {
      width: 1.5rem;
      min-width: 1.5rem;
      height: 1.5rem;

      .material-icons, .material-icons-outlined {
        font-size: 1.2rem;
      }
    }
  }
}
</style>
