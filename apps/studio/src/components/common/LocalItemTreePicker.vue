<template>
  <div>
    <tree
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
          :for="`item-${node.ref.id}`"
          class="checkbox-group"
        >
          <input
            type="checkbox"
            :checked="isSelected(node)"
            @click.stop="toggleSelected(node)"
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
  computed: {
    paths() {
      const modulePaths = {
        query: ["data/queries", "data/queryFolders"],
        connection: ["data/connections", "data/connectionFolders"]
      }

      return modulePaths[this.type];
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
    isSelected(node) {
      return this.value.includes(node.ref.id);
    },
    toggleSelected(node) {
      const id = node.ref.id;
      let newValue: number[];
      if (this.value.includes(id)) {
        newValue = this.value.filter((v) => v !== id);
      } else {
        newValue = [...this.value, id];
      }
      this.$emit('input', newValue)
    }
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
    log.info("MOUNT")
    await this.initializeItemTree();
  },
  async beforeDestroy() {
    log.info("DESTROY")
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
label.checkbox-group {
  display: flex;
  padding-left: calc(var(--depth) * 1.2rem);
}
</style>
