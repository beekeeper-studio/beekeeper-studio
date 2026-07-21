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
        <error-alert
          v-if="error"
          :error="error"
          title="Problem loading queries"
        />
        <sidebar-loading v-if="loading" />
        <nav
          v-else
          class="list-body"
          ref="wrapper"
        >
          <tree
            :folders="folders"
            :items="savedQueries ?? []"
            item-parent-key="queryFolderId"
            :expanded-folder-ids="expandedFolderIds"
            @update:expandedFolderIds="setExpandedFolderIds"
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
                @contextmenu.native="showFolderContextMenu($event, props.node.ref)"
              />
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
    <portal to="modals">
      <modal
        class="vue-dialog beekeeper-modal"
        name="query-folder-modal"
        @closed="folderModalName = ''; folderModalItem = null; folderModalError = null"
        @opened="$nextTick(() => $refs.folderNameInput && $refs.folderNameInput.focus())"
        height="auto"
        :scrollable="true"
      >
        <form @submit.prevent="submitFolderModal">
          <div class="dialog-content" v-kbd-trap="true">
            <div class="dialog-c-title">
              {{ folderModalItem ? 'Rename Folder' : folderModalParentId ? 'New Subfolder' : 'New Folder' }}
            </div>
            <div class="form-group">
              <label>Folder Name</label>
              <input
                ref="folderNameInput"
                v-model="folderModalName"
                type="text"
                placeholder="Folder name"
                @input="folderModalError = null"
                @keydown.esc.prevent="$modal.hide('query-folder-modal')"
              >
            </div>
            <div class="form-group" v-if="isCloud && !folderModalItem && rootFolders.length > 0">
              <label>Parent Folder</label>
              <select v-model="folderModalParentId" @change="folderModalError = null">
                <option v-for="f in rootFolders" :key="f.id" :value="f.id">
                  {{ f.name }}
                </option>
              </select>
            </div>
            <error-alert v-if="folderModalError" :error="folderModalError" />
          </div>
          <div class="vue-dialog-buttons flex-between">
            <span class="left" />
            <span class="right">
              <button class="btn btn-flat" type="button" @click.prevent="$modal.hide('query-folder-modal')">Cancel</button>
              <button class="btn btn-primary" type="submit" :disabled="!folderModalName.trim() || folderModalSubmitting">
                {{ folderModalItem ? 'Rename' : 'Create' }}
              </button>
            </span>
          </div>
        </form>
      </modal>
    </portal>
  </div>
</template>

<script>
import ErrorAlert from '@/components/common/ErrorAlert.vue'
import { mapGetters, mapState } from 'vuex'
import SidebarLoading from '../../common/SidebarLoading.vue'
import FavoriteListItem from './favorite_list/FavoriteListItem.vue'
import { AppEvent } from '@/common/AppEvent'
import { Tree, TreeFolder } from "@beekeeperstudio/ui-kit/vue/tree";
import { SmartLocalStorage } from '@/common/LocalStorage'

export default {
  components: { SidebarLoading, ErrorAlert, FavoriteListItem, Tree, TreeFolder },
  data: function () {
    return {
      checkedFavorites: [],
      selected: null,
      folderModalName: '',
      folderModalItem: null,
      folderModalParentId: null,
      folderModalError: null,
      folderModalSubmitting: false,
      expandedFolderIds: [],
      draggingQuery: null,
      renamingFolderId: null,
    }
  },
  watch: {
    workspaceId() {
      this.restoreExpandedFolderIds()
    },
    loading() {
      if (this.loading) {
        return;
      }
      if (SmartLocalStorage.exists(this.expandedStorageKey)) {
        return;
      }
      this.seedExpandedFolderIds();
    },
  },
  mounted() {
    SmartLocalStorage.remove('queryFolderExpanded-v1')
    this.restoreExpandedFolderIds()
    document.addEventListener('mousedown', this.maybeUnselect)
  },
  beforeDestroy() {
    document.removeEventListener('mousedown', this.maybeUnselect)
  },
  computed: {
    ...mapState(['workspaceId']),
    ...mapGetters(['workspace', 'isCloud', 'isUltimate']),
    // v1 was a single workspace-agnostic map, so its expanded state can't be
    // attributed to a workspace — it is dropped rather than migrated.
    expandedStorageKey() {
      return `queryFolderExpanded-v2-${this.workspaceId}`;
    },
    ...mapGetters('data/queries', {'filteredQueries': 'filteredQueries'}),
    ...mapState('tabs', {'activeTab': 'active'}),
    ...mapState('data/queries', {'savedQueries': 'items', 'queriesLoading': 'loading', 'queriesError': 'error', 'savedQueryFilter': 'filter', 'pendingSaveIds': 'pendingSaveIds'}),
    ...mapState('data/queryFolders', {'folders': 'items', 'foldersLoading': 'loading', 'foldersError': 'error'}),
    filterQuery: {
      get() {
        return this.savedQueryFilter;
      },
      set(newFilter) {
        this.$store.dispatch('data/queries/setSavedQueryFilter', newFilter);
      }
    },
    rootFolders() {
      return this.folders.filter((f) => !f.parentId).sort((a, b) => a.name.localeCompare(b.name))
    },
    loading() {
      return this.queriesLoading || this.foldersLoading || null
    },
    error() {
      return this.queriesError || this.foldersError || null
    },
    removeTitle() {
      return `Remove ${this.checkedFavorites.length} saved queries`;
    }
  },
  methods: {
    setExpandedFolderIds(expandedFolderIds) {
      this.expandedFolderIds = expandedFolderIds
      SmartLocalStorage.addItem(this.expandedStorageKey, expandedFolderIds)
    },
    restoreExpandedFolderIds() {
      this.expandedFolderIds = SmartLocalStorage.getJSON(this.expandedStorageKey) ?? []
    },
    seedExpandedFolderIds() {
      const ids = new Set(this.expandedFolderIds);
      for (const folder of this.rootFolders) {
        ids.add(folder.id)
      }
      this.expandedFolderIds = [...ids];
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
    refresh() {
      this.$store.dispatch("data/queries/load")
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
      if (!this.isUltimate && !this.isCloud) {
        this.$root.$emit(AppEvent.upgradeModal, 'Folders')
        return
      }
      this.folderModalName = ''
      this.folderModalItem = null
      this.folderModalError = null
      this.folderModalParentId = (this.isCloud && this.rootFolders.length > 0)
        ? this.rootFolders[0].id
        : null
      this.$modal.show('query-folder-modal')
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
        handler: ({ item }) => this.createSubfolder(item),
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
            handler: ({ item }) => this.trigger(AppEvent.openMoveFileModal, { type: 'queryFolder', value: item }),
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
    async handleTreeNodeMove({ source, position, parentId }) {
      try {
        if (source.type === 'folder') {
          if (parentId === (source.ref.parentId ?? null)) {
            return
          }
          await this.$store.dispatch('data/queryFolders/save', {
            ...source.ref,
            parentId,
          })
        } else {
          await this.$store.dispatch('data/queries/reorder', {
            item: source.ref,
            queryFolderId: parentId,
            position,
          })
        }
      } catch (ex) {
        this.$noty.error(`Move error: ${ex.userMessage ?? ex.message}`)
      }
    },
    share(folder) {
      this.trigger(AppEvent.openShareModal, {
        id: folder.id,
        module: "data/queryFolders",
      });
    },
    createSubfolder(parentFolder) {
      if (!this.isUltimate && !this.isCloud) {
        this.$root.$emit(AppEvent.upgradeModal, 'Folders')
        return
      }
      this.folderModalName = ''
      this.folderModalItem = null
      this.folderModalError = null
      this.folderModalParentId = parentFolder.id
      this.$modal.show('query-folder-modal')
    },
    showLonelyContextMenu(event) {
      this.$bks.openMenu({
        event,
        item: null,
        options: [{ name: 'New Folder', handler: () => this.createFolder() }]
      })
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
    onQueryDragStart(event, list) {
      this.draggingQuery = list[event.oldIndex]
    },
    cloudRelativePosition(list, newIndex) {
      const prev = list[newIndex - 1]
      const next = list[newIndex + 1]
      if (prev) return { after: prev.id }
      if (next) return { before: next.id }
      return { before: null }
    },
    async onQueryFolderHeaderDrop(folder) {
      if (!this.draggingQuery) return
      try {
        // Use reorder action for both local and cloud workspaces
        await this.$store.dispatch('data/queries/reorder', {
          item: this.draggingQuery,
          queryFolderId: folder.id,
          position: { before: null }
        })
      } catch (ex) {
        this.$noty.error(`Move error: ${ex.userMessage ?? ex.message}`)
      }
    },
    async onQueryDrop(event, folder, currentList) {
      try {
        if (event.added) {
          const { element: item, newIndex } = event.added
          // Use reorder action for both local and cloud workspaces
          await this.$store.dispatch('data/queries/reorder', {
            item,
            queryFolderId: folder?.id ?? null,
            position: this.cloudRelativePosition(currentList, newIndex)
          })
        } else if (event.moved) {
          const { element: item, newIndex } = event.moved
          // Use reorder action for both local and cloud workspaces
          await this.$store.dispatch('data/queries/reorder', {
            item,
            position: this.cloudRelativePosition(currentList, newIndex)
          })
        }
      } catch (ex) {
        this.$noty.error(`Move error: ${ex.userMessage ?? ex.message}`)
      }
    },
    async submitFolderModal() {
      const name = this.folderModalName.trim()
      if (!name) return
      this.folderModalError = null
      this.folderModalSubmitting = true
      try {
        if (this.folderModalItem) {
          await this.$store.dispatch('data/queryFolders/save', { ...this.folderModalItem, name })
        } else {
          await this.$store.dispatch('data/queryFolders/save', { id: null, name, parentId: this.folderModalParentId ?? null })
        }
        this.$modal.hide('query-folder-modal')
      } catch (e) {
        this.folderModalError = e.userMessage ?? e.message ?? 'Failed to save folder'
      } finally {
        this.folderModalSubmitting = false
      }
    },
  }
}
</script>

<style lang="scss" scoped>
.drag-ghost {
  opacity: 0.4;
}
.drag-pending {
  opacity: 0.5;
}
.folder-drop-zone {
  min-height: 8px;
}
</style>
