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
          v-if="error"
          :error="error"
          title="Problem loading queries"
        />
        <sidebar-loading v-if="initializing" />
        <nav
          v-else
          class="list-body"
          ref="wrapper"
        >
          <template v-if="cloudSearchMode">
            <div
              class="empty-state"
              v-if="!searchInProgress && filteredQueries.length === 0"
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
              v-if="searchInProgress"
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
            v-show="!cloudSearchMode"
            :folders="draftingFolder ? folderNodesWithDraft : folderNodes"
            :items="itemNodes"
            :expanded-ids="expandedNodeIds"
            :filter="filterQuery"
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
                v-if="props.node.id === 'folder-draft'"
                tag="div"
              >
                <template #name>
                  <editable-text
                    rename
                    :initial-value="props.node.name"
                    @submit="submitDraftFolder"
                    @cancel="cancelDraftFolder"
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
import { parseReorderTarget } from '@/common/utils/folderTree'

export default {
  components: { SidebarLoading, ErrorAlert, ExpiredFolderAlert, FavoriteListItem, Tree, TreeFolder, EditableText, ContentPlaceholder, ContentPlaceholderText },
  data: function () {
    return {
      checkedFavorites: [],
      selected: null,
      renamingFolderId: null,
      draftingFolder: false,
      draftFolderParentId: null,
      justCreatedFolderId: null,
      justCreatedTimeout: null,
    }
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
      'savedQueryFilter': 'filter',
      'pendingSaveIds': 'pendingSaveIds',
      searchInProgress: 'searching',
    }),
    ...mapState('data/queryFolders', {'folders': 'items', 'foldersLoading': 'loading', 'foldersError': 'error'}),
    ...mapState('data/queryFolders/sidebar', {
      expandedFolderIds: 'expandedIds',
    }),
    ...mapState({
      loadingFolderIds(state) {
        return [
          ...state["data/queryFolders"].folders.fetchingIds,
          ...state["data/queries"].folders.fetchingIds,
        ];
      },
    }),
    expandedNodeIds() {
      return this.expandedFolderIds.map((id) => `folder-${id}`);
    },
    // Cloud lazy-loads folder contents, so a match can live in a folder that was
    // never fetched. Searching hits the server and shows a flat result list.
    cloudSearchMode() {
      return this.isCloud && !!this.filterQuery;
    },
    initializing() {
      return this.folders.length === 0 && this.foldersLoading;
    },
    filterQuery: {
      get() {
        return this.savedQueryFilter;
      },
      set(newFilter) {
        this.$store.dispatch('data/queries/setSavedQueryFilter', newFilter);
      }
    },
    error() {
      return this.queriesError || this.foldersError || null
    },
    removeTitle() {
      return `Remove ${this.checkedFavorites.length} saved queries`;
    },
    folderNodesWithDraft() {
      /** @type {import("@beekeeperstudio/ui-kit").FolderNode} */
      const draftNode = {
        id: "folder-draft",
        parentId: this.draftFolderParentId
          ? `folder-${this.draftFolderParentId}`
          : null,
        type: "folder",
        name: "Untitled folder",
        children: [],
        draggable: false,
      };

      const parentIndex = this.folderNodes.findIndex((node) =>
        node.ref.id === this.draftFolderParentId
      );
      if (parentIndex === -1) {
        return [draftNode, ...this.folderNodes];
      }

      // dont mutate the original object
      const parentNode = {
        ...this.folderNodes[parentIndex],
        children: [
          draftNode,
          ...this.folderNodes[parentIndex].children,
        ],
      };
      return [
        draftNode,
        ...this.folderNodes.toSpliced(parentIndex, 1, parentNode),
      ];
    },
  },
  methods: {
    ...mapActions({
      saveFolder: 'data/queryFolders/save',
      reorderQuery: 'data/queries/reorder',
      ensureQueriesLoaded: 'data/queries/ensureLoaded',
      ensureSubfoldersLoaded: 'data/queryFolders/ensureLoaded',
    }),
    ...mapMutations({
      setExpandedFolderIds: 'data/queryFolders/sidebar/expandedIds',
    }),
    setExpandedIds(expandedNodeIds) {
      const folderIds = this.folderNodes
        .filter((node) => expandedNodeIds.includes(node.id))
        .map((node) => node.ref.id)
      this.setExpandedFolderIds(folderIds)
      this.ensureQueriesLoaded(folderIds)
      this.ensureSubfoldersLoaded(folderIds)
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
      if (await this.$confirm(`Delete "${favorite.name}"?`, undefined, { variant: "danger" })) {
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
        this.startDraftFolder(parent.id);
      } else {
        this.startDraftFolder(null);
      }
    },
    startDraftFolder(parentId) {
      this.draftFolderParentId = parentId
      this.draftingFolder = true
      if (parentId) {
        this.expandFolder(parentId)
      }
    },
    cancelDraftFolder() {
      this.draftingFolder = false
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
    async submitDraftFolder(name) {
      if (!name) {
        this.cancelDraftFolder()
        return
      }
      try {
        const id = await this.$store.dispatch('data/queryFolders/save', {
          id: null,
          parentId: this.draftFolderParentId,
          name,
        })
        this.markJustCreated(id)
      } catch (ex) {
        this.$noty.error(`Create folder error: ${ex.userMessage ?? ex.message}`)
      } finally {
        this.cancelDraftFolder()
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
        handler: ({ item }) => this.startDraftFolder(item.id),
      }];
      if (!this.isCloud || !isRoot) {
        options.push(...[
          { type: "divider" },
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
      const source = event.source;
      const target = event.target;
      try {
        if (source.type === 'folder' && target.type === 'folder') {
          await this.saveFolder({ ...source.ref, parentId: target.ref.id });
        } else if (source.type === 'item') {
          const { parentId, position } = parseReorderTarget(event);
          await this.reorderQuery({
            item: source.ref,
            queryFolderId: parentId,
            position,
          });
        }
      } catch (ex) {
        let errorMessage = `Move error: ${ex.userMessage ?? ex.message}`;
        if (ex.message.includes("[team_folder_in_personal_tree]")) {
          errorMessage =
            "You can not move this to your personal folder because it is shared with other workspace members.";
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
        await this.$store.dispatch('data/queryFolders/save', { ...folder, name })
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
  margin-block: 1rem;
  padding-left: calc(var(--depth) * 1rem + 1.3rem);
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
