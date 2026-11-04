<template>
  <div class="plugin-list-wrap">
    <div class="fixed">
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
          </x-buttons>
        </div>
      </div>
      <div class="list-filters">
        <label class="checkbox-group">
          <input
            type="checkbox"
            v-model="showUninstalled"
          >
          <span>Show uninstalled</span>
        </label>
        <template v-if="showOriginFilter">
          <label for="plugin-origin-filter">Origin:</label>
          <select
            id="plugin-origin-filter"
            class="auto-width"
            v-model="origin"
          >
            <option value="any">
              Any
            </option>
            <option value="official">
              Official
            </option>
            <option value="community">
              Community
            </option>
            <option value="unlisted">
              Unlisted
            </option>
          </select>
        </template>
      </div>
    </div>

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
    <div
      v-else
      class="plugin-list"
    >
      <plugin-item
        v-for="plugin in filteredPlugins"
        :key="plugin.id"
        :source="plugin"
        :is-searching="!!searchQuery"
        :broken-avatars="brokenAvatars"
        :emit="emitItemEvent"
        :mark-as-broken-avatar="markAsBrokenAvatar"
      />
    </div>
  </div>
</template>

<script lang="ts">
import Vue, { PropType } from "vue";
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
  components: { PluginItem },
  props: {
    plugins: {
      type: Array as PropType<ExtensionUI[]>,
      required: true,
    },
    searchPlaceholder: {
      type: String,
      default: "Search Plugins",
    },
    showOriginFilter: {
      type: Boolean,
      default: true,
    },
  },
  data() {
    return {
      // we do this so we don't continuously try bad urls
      brokenAvatars: [] as string[],
      searchQuery: null,
      origin: "any" as "any" | ExtensionOrigin,
      showUninstalled: true,
    };
  },
  computed: {
    ...mapGetters("plugins/snapshots", ["snapshotsById"]),
    filteredPlugins() {
      let plugins: ExtensionUI[] = this.plugins;
      if (this.origin !== "any") {
        plugins = plugins.filter((p: ExtensionUI) => p.origin === this.origin);
      }
      if (!this.showUninstalled) {
        plugins = plugins.filter((p: ExtensionUI) => p.installed);
      }
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
  methods: {
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

.fixed {
  position: sticky;
  // Sits below a ConfigPage's sticky header when inside one
  top: var(--config-page-header-height, 0);
  z-index: 1;
  background: var(--panel-bg);
}

.list-filters {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: $gutter-h;
  padding-inline: 0.5rem;

  .checkbox-group {
    margin-right: auto;
    padding-left: 0;
  }
}

.filter {
  position: relative;
  margin-bottom: $gutter-h;
  padding-inline: 0.5rem;
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
    .material-icons, .material-icons-outlined {
      font-size: 14px;
      line-height: 26px;
      width: 14px;
      color: var(--text-muted);
    }
  }
}
</style>
