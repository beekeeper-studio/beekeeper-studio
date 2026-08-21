<template>
  <div class="sidebar-favorites flex-col expand">
    <div class="sidebar-list">
      <div class="list-group">
        <div class="list-heading row">
          <div class="sub row flex-middle expand">
            <div class="expand">
              Saved Queries
            </div>
            <div class="actions">
              <a
                @click.prevent="createFolder"
                title="New Folder"
              >
                <i class="material-icons-outlined">create_new_folder</i>
              </a>
              <x-button
                title="Import queries"
              >
                <i class="material-icons">save_alt</i>
                <x-menu style="--align: end;">
                  <x-menuitem @click.prevent="importFromComputer">
                    <x-label>Import .sql files into Saved Queries</x-label>
                  </x-menuitem>
                  <x-menuitem
                    v-if="isCloud"
                    @click.prevent="importFromLocal"
                  >
                    <x-label>Import from local workspace</x-label>
                    <i
                      v-if="$store.getters.isCommunity"
                      class="material-icons menu-icon"
                    >stars</i>
                  </x-menuitem>
                </x-menu>
              </x-button>
              <a
                class=""
                @click.prevent="refresh"
              >
                <i
                  title="Refresh Saved Queries"
                  class="material-icons"
                >refresh</i>
              </a>
            </div>
          </div>
        </div>
        <!-- Filter -->
        <div class="fixed query-filter">
          <div class="filter">
            <div class="filter-wrap">
              <input
                class="filter-input"
                type="text"
                placeholder="Filter"
                v-model="filterQuery"
              >
              <x-buttons class="filter-actions">
                <x-button
                  @click="clearFilter"
                  v-if="filterQuery"
                >
                  <i class="clear material-icons">cancel</i>
                </x-button>
              </x-buttons>
            </div>
          </div>
        </div>
        <expired-folder-alert v-if="!canCreateFolders && folders.length > 0" />
        <error-alert
          v-if="error && !isPollError && !errorList.includes(error)"
          :error="error"
          title="Problem loading queries"
        />
        <sidebar-loading v-if="initializing" />
        <nav
          v-else
          class="list-body"
          ref="wrapper"
        >
          <template v-if="searching">
            <div
              class="empty-state"
              v-if="!typing && !fetchingResults && filteredQueries.length === 0"
            >
              No queries match "{{ filterQuery }}"
            </div>
            <favorite-list-item
              v-for="query in filteredQueries"
              :key="query.id"
              :item="query"
              :active="isActive(query)"
              :selected="selected === query"
              @remove="remove"
              @select="select"
              @open="open"
              @open-history="openHistory"
              @export="exportTo"
              @duplicate="duplicate"
            />
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
            v-show="!searching"
            :folders="extendedFolderNodes"
            :items="sortedItemNodes"
            :expanded-ids="expandedNodeIds"
            @update:expandedIds="setExpandedIds"
            @bks-tree-node-move="handleTreeNodeMove"
          >
            <template #empty>
              <div class="empty">
                <span class="empty-title">No Saved Queries</span>
                <span
                  class="empty-actions"
                  v-if="isCloud"
                >
                  <a
                    class="btn btn-flat btn-block btn-icon"
                    @click.prevent="importFromLocal"
                    title="Import queries from local workspace"
                  ><i class="material-icons">save_alt</i> Import</a>
                </span>
              </div>
            </template>
            <template #folder="{ props }">
              <tree-folder
                v-bind="props"
                v-if="props.node.ref === draft"
                tag="div"
              >
                <template #name>
                  <editable-text
                    rename
                    :initial-value="props.node.name"
                    @submit="commitDraft"
                    @cancel="stopDrafting"
                  />
                </template>
              </tree-folder>
              <tree-folder
                v-bind="props"
                v-else
                :class="{ 'just-created': justCreatedFolderId === props.node.ref.id }"
                :tag="renamingFolderId === props.node.ref.id ? 'div': undefined"
                @contextmenu.native="showFolderContextMenu($event, props.node.ref)"
              >
                <template
                  #name
                  v-if="renamingFolderId === props.node.ref.id"
                >
                  <editable-text
                    rename
                    :initial-value="props.node.ref.name"
                    @submit="submitFolderRename(props.node.ref, $event)"
                    @cancel="renamingFolderId = null"
                  />
                </template>
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
              <favorite-list-item
                :item="node.ref"
                :active="isActive(node.ref)"
                :selected="selected === node.ref"
                :class="{ 'drag-pending': (pendingSaveIds || []).includes(node.ref.id) }"
                @remove="remove"
                @select="select"
                @open="open"
                @open-history="openHistory"
                @export="exportTo"
                @duplicate="duplicate"
              />
            </template>
          </tree>
        </nav>
      </div>
    </div>
  </div>
</template>

<script>
import _ from 'lodash'
import ErrorAlert from '@/components/common/ErrorAlert.vue'
import ExpiredFolderAlert from '@/components/common/ExpiredFolderAlert.vue'
import { mapActions, mapGetters, mapMutations, mapState } from 'vuex'
import SidebarLoading from '../../common/SidebarLoading.vue'
import FavoriteListItem from './favorite_list/FavoriteListItem.vue'
import { AppEvent } from '@/common/AppEvent'
import { Tree, TreeFolder } from "@beekeeperstudio/ui-kit/vue/tree";
import EditableText from '@/components/common/EditableText.vue'
import ContentPlaceholder from '@/components/common/loading/ContentPlaceholder.vue'
import ContentPlaceholderText from '@/components/common/loading/ContentPlaceholderText.vue'
import { buildFolderNodes, parseReorderTarget } from '@/common/utils/folderTree'

export default {
  components: { SidebarLoading, ErrorAlert, ExpiredFolderAlert, FavoriteListItem, Tree, TreeFolder, EditableText, ContentPlaceholder, ContentPlaceholderText },
  data: function () {
    return {
      checkedFavorites: [],
      selected: null,
      renamingFolderId: null,
      justCreatedFolderId: null,
      justCreatedTimeout: null,
      loadingFolderIds: [],
      errors: {},
      drafting: false,
      draftParentId: null,
      filterQuery: "",
    }
  },
  watch: {
    filterQuery(value) {
      this.setSavedQueryFilter(value);
    },
  },
  mounted() {
    document.addEventListener('mousedown', this.maybeUnselect)
  },
  beforeDestroy() {
    document.removeEventListener('mousedown', this.maybeUnselect)
    clearTimeout(this.justCreatedTimeout)
  },
  computed: {
    ...mapGetters(['workspace', 'isCloud', 'isUltimate', 'canCreateFolders']),
    ...mapGetters('data/queries', {'filteredQueries': 'filteredQueries'}),
    ...mapState('tabs', {'activeTab': 'active'}),
    ...mapState('data/queries/nodes', {'itemNodes': 'items'}),
    ...mapState('data/queryFolders/nodes', {'folderNodes': 'items'}),
    ...mapState('data/queries', {
      'queriesError': 'error',
      'queriesPollError': 'pollError',
      'savedQueryFilter': 'filter',
      'pendingSaveIds': 'pendingSaveIds',
      fetchingResults: 'searching',
    }),
    ...mapState('data/queryFolders', {
      'folders': 'items',
      'foldersLoading': 'loading',
      'foldersError': 'error',
      'foldersPollError': 'pollError',
    }),
    ...mapState('sidebar/queries', {
      expandedFolderIds: 'expandedIds',
    }),
    draft() {
      return { id: null, parentId: this.draftParentId, name: 'Untitled folder' };
    },
    extendedFolderNodes() {
      if (this.drafting) {
        return buildFolderNodes([this.draft, ...this.folders]);
      }
      return this.folderNodes;
    },
    expandedNodeIds() {
      return this.expandedFolderIds.map((id) => `folder-${id}`);
    },
    sortedItemNodes() {
      // Drag and drop is the only way to reorder queries, and it lands in
      // `position`. Sorting by title here would outrank it, so a drag would
      // save but never show.
      return _.sortBy(this.itemNodes, (n) => n.ref.position ?? 0)
    },
    searching() {
      return !!this.filterQuery;
    },
    initializing() {
      return this.folders.length === 0 && this.foldersLoading;
    },
    typing() {
      return this.filterQuery !== this.savedQueryFilter;
    },
    error() {
      return this.queriesError || this.foldersError || null
    },
    pollError() {
      return this.queriesPollError || this.foldersPollError || null
    },
    removeTitle() {
      return `Remove ${this.checkedFavorites.length} saved queries`;
    },
    errorList() {
      return Object.values(this.errors);
    },
    isPollError() {
      return (
        this.queriesError === this.queriesPollError ||
        this.foldersError === this.foldersPollError
      );
    },
  },
  methods: {
    ...mapActions({
      saveFolder: 'data/queryFolders/save',
      reorderQuery: 'data/queries/reorder',
      loadQueries: 'data/queries/loadByParentIds',
      loadQueryFolders: 'data/queryFolders/loadByParentIds',
      unloadQueries: 'data/queries/unloadByParentIds',
      unloadQueryFolders: 'data/queryFolders/unloadByParentIds',
      setSavedQueryFilter: 'data/queries/setSavedQueryFilter',
    }),
    ...mapMutations({
      setExpandedFolderIds: 'sidebar/queries/expandedIds',
    }),
    setExpandedIds(expandedNodeIds) {
      const folderIds = this.folderNodes
        .filter((node) => expandedNodeIds.includes(node.id))
        .map((node) => node.ref.id)
      const expandingIds = _.difference(folderIds, this.expandedFolderIds)
      const collapsingIds = _.difference(this.expandedFolderIds, folderIds)
      this.setExpandedFolderIds(folderIds)
      this.loadFolders(expandingIds)
      this.unloadFolders(collapsingIds)
    },
    async loadFolders(ids) {
      try {
        this.loadingFolderIds = [...this.loadingFolderIds, ...ids]
        const results = await Promise.all([
          this.loadQueries(ids),
          this.loadQueryFolders(ids),
        ]);
        const error = results.map((result) => result.error).find(Boolean)
        if (error) {
          this.setFolderErrors(ids, error);
        } else {
          this.setFolderErrors(ids, null);
        }
      } finally {
        this.loadingFolderIds = _.difference(this.loadingFolderIds, ids)
      }
    },
    unloadFolders(ids) {
      this.unloadQueries(ids);
      this.unloadQueryFolders(ids);
      this.setFolderErrors(ids, null);
    },
    setFolderErrors(ids, error) {
      for (const id of ids) {
        this.setFolderError(id, error);
      }
    },
    setFolderError(id, error) {
      this.$set(this.errors, id, error);
    },
    clearFilter() {
      this.filterQuery = null
    },
    createQuery() {
      this.$root.$emit(AppEvent.newTab)
    },
    exportTo(query) {
      this.$root.$emit(AppEvent.promptQueryExport, query)
    },
    importFromLocal() {
      if (!this.isCloud) {
          this.$root.$emit(AppEvent.upgradeModal, 'Cloud Workspaces')
          return
        }
        this.$root.$emit(AppEvent.promptQueryImport)
    },
    importFromComputer() {
      this.$root.$emit(AppEvent.promptSqlFilesImport)
    },
    maybeUnselect(e) {
      if (!this.selected) return
      if (this.$refs.wrapper.contains(e.target)) {
        return
      } else {
        this.selected = null
      }
    },
    async refresh() {
      await this.$store.dispatch('refreshQueries')
    },
    isActive(item) {
      return this.activeTab && this.activeTab.queryId === item.id
    },
    select(item) {
      this.selected = item
    },
    open(item) {
      this.$root.$emit('favoriteClick', item)
    },
    openHistory(item) {
      this.trigger('favoriteClick', item, { openHistory: true })
    },
    async remove(favorite) {
      const name = favorite.title || favorite.name
      if (await this.$confirm(`Delete "${name}"?`, undefined, { variant: "danger" })) {
        await this.$store.dispatch('data/queries/remove', favorite)
      }
    },
    async removeCheckedFavorites() {
      for(let i = 0; i < this.checkedFavorites.length; i++) {
        await this.remove(this.checkedFavorites[i])
      }
      this.checkedFavorites = [];
    },
    discardCheckedFavorites() {
      this.checkedFavorites = [];
    },
    createFolder() {
      if (!this.canCreateFolders) {
        this.$root.$emit(AppEvent.upgradeModal, 'Folders')
        return
      }
      if (this.isCloud) {
        const parent = this.folders.find((f) => f.personal && !f.parentId);
        if (!parent) {
          this.$noty.error(
            "No personal folder found. Right-click an existing folder and choose New Subfolder to create a folder instead."
          );
          return;
        }
        this.startDrafting(parent.id);
        this.expandFolder(parent.id);
      } else {
        this.startDrafting(null);
      }
    },
    startDrafting(parentId) {
      this.draftParentId = parentId
      this.drafting = true
    },
    stopDrafting() {
      this.drafting = false
    },
    markJustCreated(folderId) {
      clearTimeout(this.justCreatedTimeout)
      this.justCreatedFolderId = folderId
      this.justCreatedTimeout = setTimeout(() => {
        this.justCreatedFolderId = null
      }, 2000)
    },
    expandFolder(folderId) {
      if (this.expandedFolderIds.includes(folderId)) {
        return
      }
      this.setExpandedIds([...this.expandedNodeIds, `folder-${folderId}`])
    },
    async commitDraft(name = "") {
      if (!name.trim()) {
        this.stopDrafting()
        return
      }
      try {
        const id = await this.$store.dispatch('data/queryFolders/save', {
          id: null,
          parentId: this.draft.parentId ?? null,
          name,
        })
        this.markJustCreated(id)
      } catch (ex) {
        this.$noty.error(`Create folder error: ${ex.userMessage ?? ex.message}`)
      } finally {
        this.stopDrafting()
      }
    },
    showFolderContextMenu(event, folder) {
      if (event.target.tagName === 'INPUT') {
        return;
      }
      event.stopPropagation();
      event.preventDefault();

      const canWrite = folder.canWrite ?? true;
      const isRoot = !folder.parentId;
      const options = [{
        name: 'New Subfolder',
        handler: ({ item }) => {
          if (!this.canCreateFolders) {
            this.$root.$emit(AppEvent.upgradeModal, 'Folders');
            return;
          }
          this.startDrafting(item.id);
          this.expandFolder(item.id);
        },
      }];
      if (!this.isCloud || !isRoot) {
        options.push(...[
          {
            type: "divider",
            hideIf: !this.isCloud || folder.personal,
          },
          {
            name: "Share",
            handler: ({ item }) => this.share(item),
            hideIf: !this.isCloud || folder.personal,
          },
          {
            type: "divider",
            hideIf: !canWrite,
          },
          {
            name: 'Rename',
            handler: ({ item }) => this.renameQueryFolder(item),
            hideIf: !canWrite,
          },
          {
            name: 'Move',
            handler: ({ item }) => this.trigger(AppEvent.openMoveFolderModal, { type: 'queryFolder', value: item }),
            hideIf: !canWrite,
          },
          {
            name: 'Delete',
            handler: ({ item }) => this.deleteFolder(item),
            hideIf: !canWrite,
          },
        ].filter(({ hideIf }) => !hideIf));
      }
      this.$bks.openMenu({ event, item: folder, options })
    },
    /** @param event {import("@beekeeperstudio/ui-kit").TreeNodeMoveEvent} */
    async handleTreeNodeMove(event) {
      /** @type {import("@/common/utils/folderTree").ExtendedNode} */
      const source = event.source;
      /** @type {import("@/common/utils/folderTree").ExtendedNode} */
      const target = event.target;
      let reorderPayload = null;
      let error = null;
      try {
        if (source.type === 'folder') {
          // Dropped beside a node, the folder joins whatever holds that node.
          let parentId
          if (target.type === 'folder') {
            parentId = event.position === 'inside'
              ? target.ref.id
              : target.ref.parentId
          } else {
            parentId = target.ref[target.parentIdKey] ?? null
          }
          await this.saveFolder({ ...source.ref, parentId });
        } else if (source.type === 'item') {
          const { parentId, position } = parseReorderTarget(event);
          reorderPayload = {
            item: source.ref,
            queryFolderId: parentId,
            position,
          };
          await this.reorderQuery(reorderPayload);
        }
      } catch (ex) {
        error = ex;
      }

      if (error?.message.includes("[confirm_personal_move]")) {
        const confirmed = await this.$confirm(
          "Move to your personal folder?",
          `All workspace members will lose access to "${source.name}".`
        );
        if (!confirmed) {
          return;
        }
        error = null;
        try {
          await this.reorderQuery({ ...reorderPayload, confirm: true });
        } catch (ex) {
          error = ex;
        }
      }

      if (error) {
        let errorMessage = `Move error: ${error.userMessage ?? error.message}`;
        if (error.message.includes("[team_folder_in_personal_tree]")) {
          errorMessage =
            "You can not move a team folder to your personal folder because it is shared with other workspace members.";
        }
        this.$noty.error(errorMessage);
      }
    },
    share(folder) {
      this.trigger(AppEvent.openShareModal, {
        id: folder.id,
        module: "data/queryFolders",
      });
    },
    async duplicate(query) {
      const cloned = await this.$store.dispatch('data/queries/clone', query)
      cloned.title = 'Copy of ' + cloned.title
      await this.$store.dispatch('data/queries/save', cloned)
      this.$noty.success('Query duplicated')
    },
    renameQueryFolder(folder) {
      this.renamingFolderId = folder.id
    },
    async submitFolderRename(folder, name) {
      if (!name || name === folder.name) {
        this.renamingFolderId = null
        return
      }
      try {
        await this.$store.dispatch('data/queryFolders/save', {
          id: folder.id,
          parentId: folder.parentId,
          name,
        })
      } catch (ex) {
        this.$noty.error(`Rename error: ${ex.userMessage ?? ex.message}`)
      } finally {
        this.renamingFolderId = null
      }
    },
    async deleteFolder(folder) {
      if (await this.$confirm(`Delete folder "${folder.name}"?`)) {
        try {
          await this.$store.dispatch('data/queryFolders/remove', folder)
        } catch (e) {
          this.$noty.error(e.message)
        }
      }
    },
  }
}
</script>

<style lang="scss" scoped>
.drag-pending {
  opacity: 0.5;
}
.tree-loading {
  margin-top: 0.45rem;
  margin-bottom: -0.7rem;
  padding-left: calc(var(--depth) * 1rem + 0.55rem);
}
.tree-empty {
  padding-left: calc(var(--depth) * 1rem + 0.55rem);
  margin-block: 0.25rem;
  opacity: 0.6;
}
::v-deep .alert.error-alert.tree-error {
  margin-left: calc(var(--depth) * 1rem + 0.55rem);
  margin-right: 0.55rem;
}
::v-deep .BksTree-folder {
  .name:has(.editable-text) {
    overflow: visible;
  }

  .editable-text  {
    width: 100%;

    input {
      top: 60%;
    }
  }
}

.just-created {
  animation: just-created-fade 2s ease-out;
}

@keyframes just-created-fade {
  from {
    background: rgb(from var(--theme-primary) r g b / 25%);
  }
  to {
    background: transparent;
  }
}

.empty-state {
  padding-top: 0.25rem;
  padding-left: 0.5rem;
  font-size: 0.85rem;
}
</style>
