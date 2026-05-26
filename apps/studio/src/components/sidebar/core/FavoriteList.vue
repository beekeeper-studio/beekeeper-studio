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
          v-else-if="filteredQueries.length > 0"
          class="list-body"
          ref="wrapper"
          @contextmenu.self.prevent="showLonelyContextMenu($event)"
        >
          <bks-tree-list
            :list="tree"
            @bks-folder-toggle="onTreeFolderToggle"
            @bks-item-change="onTreeItemChange"
            @bks-folder-drop="onTreeFolderDrop"
            @bks-folder-contextmenu="showFolderContextMenu($event.event, $event.item.folder)"
          >
            <template #item="{ item: node }">
              <favorite-list-item
                :item="node.query"
                :active="isActive(node.query)"
                :selected="selected === node.query"
                :class="{ 'drag-pending': (pendingSaveIds || []).includes(node.query.id) }"
                @remove="remove"
                @select="select"
                @open="open"
                @open-history="openHistory"
                @export="exportTo"
                @duplicate="duplicate"
              />
            </template>
          </bks-tree-list>
        </nav>
        <div
          class="empty"
          v-else
        >
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
import { mapGetters, mapMutations, mapState } from 'vuex'
import SidebarLoading from '../../common/SidebarLoading.vue'
import FavoriteListItem from './favorite_list/FavoriteListItem.vue'
import { AppEvent } from '@/common/AppEvent'
import BksTreeList from '@beekeeperstudio/ui-kit/vue/tree-list'

export default {
  components: { SidebarLoading, ErrorAlert, FavoriteListItem, BksTreeList },
  data: function () {
    return {
      checkedFavorites: [],
      selected: null,
      folderModalName: '',
      folderModalItem: null,
      folderModalParentId: null,
      folderModalError: null,
      folderModalSubmitting: false,
    }
  },
  mounted() {
    document.addEventListener('mousedown', this.maybeUnselect)
  },
  beforeDestroy() {
    document.removeEventListener('mousedown', this.maybeUnselect)
  },
  computed: {
    ...mapGetters(['workspace', 'isCloud', 'isUltimate']),
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
    tree() {
      return this.$store.getters['data/queryFolders/treeItems'](this.filteredQueries)
    },
    removeTitle() {
      return `Remove ${this.checkedFavorites.length} saved queries`;
    }
  },
  methods: {
    ...mapMutations('data/queryFolders', {
      setFolderExpanded: 'setFolderExpanded',
    }),
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
      if (await this.$confirm("Really delete?")) {
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
      const options = []
      if (this.isCloud && !folder.parentId) {
        options.push({ name: 'New Subfolder', handler: ({ item }) => this.createSubfolder(item) })
      }
      if (folder.parentId) {
        const otherRoots = this.rootFolders.filter(f => f.id !== folder.parentId)
        otherRoots.forEach(root => {
          options.push({ name: `Move to ${root.name}`, handler: ({ item }) => this.moveFolderToParent(item, root) })
        })
      }
      options.push(
        { name: 'Rename', handler: ({ item }) => this.renameQueryFolder(item) },
        { name: 'Delete', handler: ({ item }) => this.deleteFolder(item) }
      )
      this.$bks.openMenu({ event, item: folder, options })
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
      this.folderModalName = folder.name
      this.folderModalItem = folder
      this.folderModalError = null
      this.$modal.show('query-folder-modal')
    },
    async moveFolderToParent(folder, newParent) {
      await this.$store.dispatch('data/queryFolders/save', { ...folder, parentId: newParent.id })
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
    relativeQueryPosition(siblings, newIndex) {
      let previous = null
      let next = null
      for (let i = newIndex - 1; i >= 0; i--) {
        if (siblings[i].type === 'item') {
          previous = siblings[i].query
          break
        }
      }
      for (let i = newIndex + 1; i < siblings.length; i++) {
        if (siblings[i].type === 'item') {
          next = siblings[i].query
          break
        }
      }
      if (previous) return { after: previous.id }
      if (next) return { before: next.id }
      return { before: null }
    },
    onTreeFolderToggle({ folder: node, expanded }) {
      if (!node.folder) return
      this.setFolderExpanded({ folderId: node.folder.id, expanded })
    },
    async onTreeFolderDrop({ folder, draggedNode }) {
      if (!draggedNode || draggedNode.type !== 'item') {
        return
      }
      if (draggedNode.query.queryFolderId === folder.folder.id) {
        return
      }
      try {
        await this.$store.dispatch('data/queries/reorder', {
          item: draggedNode.query,
          queryFolderId: folder.folder.id,
          position: { before: null },
        })
      } catch (ex) {
        this.$noty.error(`Move error: ${ex.userMessage ?? ex.message}`)
      }
    },
    async onTreeItemChange({ event, siblings, targetFolder }) {
      try {
        const payload = {
          item: event.element.query,
          position: this.relativeQueryPosition(siblings, event.newIndex),
        }
        if (event.type === 'added') {
          payload.queryFolderId = targetFolder?.id ?? null;
        }
        await this.$store.dispatch('data/queries/reorder', payload);
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
@import '../../../assets/styles/app/_variables';

</style>
