<template>
  <div>
    <div class="fixed">
      <div class="filter">
        <div class="filter-wrap">
          <input
            class="filter-input"
            type="text"
            placeholder="Filter"
            v-model="filterText"
          >
          <x-buttons class="filter-actions">
            <x-button
              @click="clearFilter"
              v-if="filterText"
            >
              <i class="clear material-icons">cancel</i>
            </x-button>
          </x-buttons>
        </div>
      </div>
    </div>
    <template v-if="searching">
      <div
        class="empty-state"
        v-if="!typing && !fetchingResults && filteredItems.length === 0"
      >
        No items match "{{ filterText }}"
      </div>
      <div
        class="item"
        v-for="item in filteredItems"
        :key="item.id"
      >
        <label
          :for="`cb-${item.id}`"
          class="checkbox-group"
        >
          <input
            type="checkbox"
            :checked="isSelected(item.id)"
            @click.stop="toggleSelected(item.id)"
            :name="`cb-${item.id}`"
            :id="`cb-${item.id}`"
          >
          {{ item.name ?? item.title }}
        </label>
      </div>
      <content-placeholder
        v-if="fetchingResults || typing"
        :animated="true"
        :rounded="false"
        class="list-item"
      >
        <content-placeholder-text
          :lines="2"
          class="list-item-btn"
        />
      </content-placeholder>

    </template>
    <tree
      v-else
      :folders="folderNodes"
      :items="itemNodes"
      :expanded-ids="expandedNodeIds"
      @update:expandedIds="setExpandedIds"
    >
      <template #folder="{ props }">
        <tree-folder
          v-bind="props"
        >
        </tree-folder>
      </template>
      <template #folder-header="{ node, depth }">
        <error-alert
          v-if="errors[node.ref.id]"
          :error="errors[node.ref.id]"
          title="Problem loading folder"
          class="tree-error"
          :style="{ '--depth': depth }"
          @close="setFolderError(node.ref.id, null)"
        />
      </template>
      <template #folder-footer="{ node, depth }">
        <content-placeholder
          v-if="loadingFolderIds.includes(node.ref.id)"
          :animated="true"
          :rounded="false"
          class="tree-loading"
          :style="{ '--depth': depth }"
        >
          <content-placeholder-text :lines="1" />
        </content-placeholder>
      </template>
      <template #folder-empty="{ node, depth }">
        <div
          v-if="!loadingFolderIds.includes(node.ref.id) && !errors[node.ref.id]"
          class="tree-empty"
          :style="{ '--depth': depth }"
        >
          No items
        </div>
      </template>
      <template #item="{ node }">
        <label
          :for="`cb-${node.ref.id}`"
          class="checkbox-group"
        >
          <input
            type="checkbox"
            :checked="isSelected(node.ref.id)"
            @click.stop="toggleSelected(node.ref.id)"
            :name="`cb-${node.ref.id}`"
            :id="`cb-${node.ref.id}`"
          >
          {{ node.ref.name ?? node.ref.title }}
        </label>
      </template>
      <template #empty>
        <slot name="empty">
          No Items
        </slot>
      </template>
    </tree>
  </div>
</template>

<script lang="ts">
import Vue, { PropType } from "vue";
import { Tree, TreeFolder } from "@beekeeperstudio/ui-kit/vue/tree";
import { TreeExpansionModule } from '@/store/modules/sidebar/TreeExpansionModule';
import { DataModules } from '@/store/DataModules';
import ContentPlaceholder from '@/components/common/loading/ContentPlaceholder.vue'
import ContentPlaceholderText from '@/components/common/loading/ContentPlaceholderText.vue'
import _ from 'lodash';
import rawLog from '@bksLogger';

const log = rawLog.scope('LocalItemTreePicker');

export default Vue.extend({
  components: { Tree, TreeFolder, ContentPlaceholder, ContentPlaceholderText },
  data: () => {
    return {
      idTrackerPath: 'local/expandedIds',
      loadingFolderIds: [],
      errors: {},
      filterText: null
    }
  },
  props: {
    type: {
      type: String as PropType<"query" | "connection">,
      default: "query"
    },
    value: {
      type: Array as PropType<Array<number>>,
      default: () => []
    }
  },
  watch: {
    filterText(value) {
      this.$store.dispatch(`${this.itemPath}/set${_.upperFirst(this.type)}Filter`, value);
    }
  },
  computed: {
    paths() {
      const modulePaths = {
        query: ["data/queries", "data/queryFolders"],
        connection: ["data/connections", "data/connectionFolders"]
      }

      return modulePaths[this.type];
    },
    plural() {
      return this.type === 'query' ? 'queries' : 'connections';
    },
    itemPath() {
      return `local/${this.paths[0]}`;
    },
    folderPath() {
      return `local/${this.paths[1]}`;
    },
    expandedFolderIds() {
      return this.$store.state[this.idTrackerPath]?.expandedIds ?? [];
    },
    expandedNodeIds() {
      return this.expandedFolderIds.map((id) => `folder-${id}`);
    },
    folderNodes() {
      return this.$store.state[this.folderPath]?.nodes?.items ?? [];
    },
    itemNodes() {
      return this.$store.state[this.itemPath]?.nodes?.items ?? [];
    },
    itemFilter() {
      return this.$store.state[this.itemPath]?.filter;
    },
    searching() {
      return !!this.filterText;
    },
    typing() {
      return this.filterText !== this.itemFilter;
    },
    fetchingResults() {
      return this.$store.state[this.itemPath]?.searching;
    },
    filteredItems() {
      return this.$store.getters[`${this.itemPath}/filtered${_.upperFirst(this.plural)}`] ?? [];
    }
  },
  methods: {
    async initializeItemTree() {
      await Promise.all([
        this.$store.dispatch(`${this.folderPath}/refresh`, []),
        this.$store.dispatch(`${this.itemPath}/refresh`, [])
      ])

      this.setExpandedFolderIds([]);

      await Promise.all([
        this.$store.dispatch(`${this.folderPath}/loadByParentIds`, []),
        this.$store.dispatch(`${this.itemPath}/loadByParentIds`, [])
      ]);
    },
    async loadItems(ids: number[]) {
      return await this.$store.dispatch(`${this.itemPath}/loadByParentIds`, ids);
    },
    async loadItemFolders(ids: number[]) {
      return await this.$store.dispatch(`${this.folderPath}/loadByParentIds`, ids);
    },
    async unloadItems(ids: number[]) {
      return await this.$store.dispatch(`${this.itemPath}/unloadByParentIds`, ids);
    },
    async unloadItemFolders(ids: number[]) {
      return await this.$store.dispatch(`${this.folderPath}/unloadByParentIds`, ids);
    },
    setExpandedFolderIds(ids: number[]) {
      this.$store.commit(`${this.idTrackerPath}/expandedIds`, ids);
    },
    async setExpandedIds(ids: number[]) {
      const folderIds = this.folderNodes
        .filter((node) => ids.includes(node.id))
        .map((node) => node.ref.id);

      const expandingIds = _.difference(folderIds, this.expandedFolderIds);
      const collapsingIds = _.difference(this.expandedFolderIds, folderIds);
      this.setExpandedFolderIds(folderIds);
      this.loadFolders(expandingIds);
      this.unloadFolders(collapsingIds);
    },
    async loadFolders(ids: number[]) {
      try {
        this.loadingFolderIds = [...this.loadingFolderIds, ...ids];
        const results = await Promise.all([
          this.loadItems(ids),
          this.loadItemFolders(ids),
        ]);
        const error = results.map((result) => result.error).find(Boolean);
        if (error) {
          // handle later
        }
      } finally {
        this.loadingFolderIds = _.difference(this.loadingFolderIds, ids);
      }
    },
    async unloadFolders(ids: number[]) {
      this.unloadItems(ids);
      this.unloadItemFolders(ids);
    },
    isSelected(id: number) {
      return this.value.includes(id);
    },
    toggleSelected(id: number) {
      let newValue: number[];
      if (this.value.includes(id)) {
        newValue = this.value.filter((v) => v !== id);
      } else {
        newValue = [...this.value, id];
      }
      this.$emit('input', newValue)
    },
    clearFilter() {
      this.filterText = null
    },

  },
  beforeMount() {
    // mount local vuex modules
    for (const dataMod of DataModules) {
      if (!this.paths.includes(dataMod.path)) continue;
      const mod = dataMod['local']
      if (!mod) throw new Error(`No local module defined for ${dataMod.path}`);

      const path = `local/${dataMod.path}`;
      if (this.$store.hasModule(path)) {
        this.$store.unregisterModule(path);
      }

      log.info('Registering dynamic vuex module: ', path)
      this.$store.registerModule(path, mod);
      this.$store.dispatch(`${path}/initialize`);
    }

    if (this.$store.hasModule(this.idTrackerPath)) {
      this.$store.unregisterModule(this.idTrackerPath);
    }

    this.$store.registerModule(this.idTrackerPath, TreeExpansionModule);
  },
  async mounted() {
    await this.initializeItemTree();
  },
  async beforeDestroy() {
    const paths = [ this.itemPath, this.folderPath, this.idTrackerPath ];

    for (const path of paths) {
      if (this.$store.hasModule(path)) {
        this.$store.unregisterModule(path);
      }
    }
  }
})

</script>

<style lang="scss" scoped>
@import '../../shared/assets/styles/_variables';
label.checkbox-group {
  display: flex;
  padding-left: calc(var(--depth) * 1.2rem);

  input[type="checkbox"] {
    $checkbox-size: 15px;

    height: $checkbox-size;
    line-height: $checkbox-size;
    width: $checkbox-size;
    min-width: $checkbox-size;
    border-radius: 4px;
    &:checked:after {
      font-size: $checkbox-size;
    }
    &:focus,
    &:focus-visible {
      outline-offset: -2px !important;
    }
  }
}
.item {
  display: flex;
  align-items: center;
  line-height: 1.6;
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

      .material-icons, .material-icons-outlined {
        font-size: 14px;
        line-height: 26px;
        width: 14px;
        color: rgba($theme-base, 0.5);
      }
    }
  }
}
</style>
