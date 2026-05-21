<template>
  <div class="sidebar-wrap row">
    <workspace-sidebar />

    <!-- QUICK CONNECT -->
    <div class="tab-content flex-col expand">
      <div class="btn-wrap quick-connect">
        <a
          href=""
          class="btn btn-flat btn-icon btn-block"
          @click.prevent="$emit('create')"
        >
          <i class="material-icons">add</i>
          <span>New Connection</span>
        </a>
      </div>
      <!-- Filter -->
      <div class="fixed">
        <div class="filter">
          <div class="filter-wrap">
            <input
              class="filter-input"
              type="text"
              placeholder="Filter"
              v-model="connFilter"
            >
            <x-buttons class="filter-actions">
              <x-button
                @click="clearFilter"
                v-if="connFilter"
              >
                <i class="clear material-icons">cancel</i>
              </x-button>
            </x-buttons>
          </div>
        </div>
      </div>

      <div class="connection-wrap expand flex-col">
        <!-- Pinned Connections -->
        <!-- TODO (day): should probably make a class for pinned connections-->
        <div
          class="list saved-connection-list expand"
          ref="pinnedConnectionList"
          v-show="!noPins && !connFilter"
        >
          <div class="list-group">
            <div class="list-heading">
              <div class="flex">
                <div class="sub row flex-middle noselect">
                  Pinned <span class="badge">{{ (pinnedConnections || []).length }}</span>
                </div>
              </div>
              <span class="expand" />
              <div class="actions">
                <a @click.prevent="refresh"><i class="material-icons">refresh</i></a>
              </div>
            </div>
            <error-alert
              :error="error"
              v-if="error"
              title="Problem loading connections"
              @close="error = null"
              :closable="true"
            />
            <sidebar-loading v-else-if="loading" />
            <nav
              v-else
              class="list-body"
            >
              <connection-list-item
                v-for="c in pinnedConnections"
                :key="c.id"
                :config="c"
                :selected-config="selectedConfig"
                :show-duplicate="true"
                :pinned="true"
                :privacy-mode="privacyMode"
                @edit="edit"
                @remove="remove"
                @duplicate="duplicate"
                @doubleClick="connect"
              />
            </nav>
          </div>
        </div>

        <hr v-show="!noPins"> <!-- fake gutter for split.js -->

        <!-- Saved Connections -->
        <div
          class="list saved-connection-list expand"
          ref="savedConnectionList"
        >
          <div class="list-group">
            <div class="list-heading">
              <div class="flex">
                <div class="sub row flex-middle noselect">
                  Saved <span class="badge">{{ (filteredConnections || []).length }}</span>
                </div>
                <span class="expand" />
                <div class="actions">
                  <a
                    v-if="isCloud"
                    @click.prevent="importFromLocal"
                    title="Import connections from local workspace"
                  >
                    <i class="material-icons">save_alt</i>
                  </a>
                  <a
                    @click.prevent="createFolder"
                    title="New Folder"
                  >
                    <i class="material-icons-outlined">create_new_folder</i>
                  </a>
                  <a @click.prevent="refresh"><i class="material-icons">refresh</i></a>
                  <sidebar-sort-buttons
                    v-model="sort"
                    :sort-options="sortables"
                  />
                </div>
                <!-- <x-button class="actions-btn btn btn-link btn-small" v-tooltip="`Sorted by ${sortables[sortOrder]}`">
                  <i class="material-icons-outlined">sort</i>
                  <x-menu style="--target-align: right;">
                    <x-menuitem
                      v-for="i in Object.keys(sortables)"
                      :key="i"
                      :toggled="i === sortOrder"
                      togglable
                      @click="sortConnections(i)"
                    >
                      <x-label>{{ sortables[i] }}</x-label>
                    </x-menuitem>
                  </x-menu>
                </x-button> -->
              </div>
            </div>
            <error-alert
              :error="error"
              v-if="error"
              title="Problem loading connections"
              @close="error = null"
              :closable="true"
            />
            <sidebar-loading v-else-if="loading" />
            <div
              v-else-if="empty"
              class="empty"
            >
              <div class="empty-title">
                No Saved Connections
              </div>
              <div
                class="empty-actions"
                v-if="isCloud"
              >
                <a
                  class="btn btn-flat btn-block btn-icon"
                  @click.prevent="importFromLocal"
                  title="Import connections from local workspace"
                ><i class="material-icons">save_alt</i> Import</a>
              </div>
            </div>
            <nav
              v-else
              class="list-body"
            >
              <sidebar-folder
                v-for="{ folder, connections, subfolders } in foldersWithConnections"
                :key="`${folder.id}-${connections.length}`"
                :title="`${folder.name} (${connections.length})`"
                placeholder="No Items"
                :expanded-initially="getFolderExpanded(folder.id)"
                @toggle="onFolderToggle(folder.id, $event)"
                @contextmenu.native.stop.prevent="showFolderContextMenu($event, folder)"
                @header-drop="onConnectionFolderHeaderDrop(folder)"
              >
                <Draggable
                  :list="connections"
                  group="connections"
                  ghost-class="drag-ghost"
                  @start="onConnectionDragStart($event, connections)"
                  @end="draggingConnection = null"
                  @change="onConnectionDrop($event, folder, connections)"
                >
                  <connection-list-item
                    v-for="c in connections"
                    :key="c.id"
                    :config="c"
                    :selected-config="selectedConfig"
                    :show-duplicate="true"
                    :pinned="pinnedConnections.includes(c)"
                    :privacy-mode="privacyMode"
                    :class="{ 'drag-pending': (pendingSaveIds || []).includes(c.id) }"
                    @edit="edit"
                    @remove="remove"
                    @duplicate="duplicate"
                    @doubleClick="connect"
                  />
                </Draggable>
                <sidebar-folder
                  v-for="{ folder: subfolder, connections: subConnections } in subfolders"
                  :key="`${subfolder.id}-${subConnections.length}`"
                  :title="`${subfolder.name} (${subConnections.length})`"
                  placeholder="No Items"
                  :expanded-initially="getFolderExpanded(subfolder.id)"
                  @toggle="onFolderToggle(subfolder.id, $event)"
                  @contextmenu.native.stop.prevent="showFolderContextMenu($event, subfolder)"
                  @header-drop="onConnectionFolderHeaderDrop(subfolder)"
                >
                  <Draggable
                    :list="subConnections"
                    group="connections"
                    ghost-class="drag-ghost"
                    @start="onConnectionDragStart($event, subConnections)"
                    @end="draggingConnection = null"
                    @change="onConnectionDrop($event, subfolder, subConnections)"
                  >
                    <connection-list-item
                      v-for="c in subConnections"
                      :key="c.id"
                      :config="c"
                      :selected-config="selectedConfig"
                      :show-duplicate="true"
                      :pinned="pinnedConnections.includes(c)"
                      :privacy-mode="privacyMode"
                      :class="{ 'drag-pending': (pendingSaveIds || []).includes(c.id) }"
                      @edit="edit"
                      @remove="remove"
                      @duplicate="duplicate"
                      @doubleClick="connect"
                    />
                  </Draggable>
                </sidebar-folder>
              </sidebar-folder>
              <Draggable
                :list="lonelyConnections"
                :group="isCloud ? { name: 'connections', put: false } : 'connections'"
                ghost-class="drag-ghost"
                @start="onConnectionDragStart($event, lonelyConnections)"
                @end="draggingConnection = null"
                @change="onConnectionDrop($event, null, lonelyConnections)"
                @contextmenu.self.prevent="showLonelyContextMenu($event)"
              >
                <connection-list-item
                  v-for="c in lonelyConnections"
                  :key="c.id"
                  :config="c"
                  :selected-config="selectedConfig"
                  :show-duplicate="true"
                  :pinned="pinnedConnections.includes(c)"
                  :privacy-mode="privacyMode"
                  :class="{ 'drag-pending': (pendingSaveIds || []).includes(c.id) }"
                  @edit="edit"
                  @remove="remove"
                  @duplicate="duplicate"
                  @doubleClick="connect"
                />
              </Draggable>
            </nav>
          </div>
        </div>

        <hr> <!-- Fake gutter for split.js -->

        <!-- Recent Connections -->
        <div
          class="list recent-connection-list expand"
          ref="recentConnectionList"
          v-show="!connFilter"
        >
          <div class="list-group">
            <div class="list-heading">
              <div class="sub row flex-middle noselect">
                Recent <span class="badge">{{ usedConfigs.length }}</span>
              </div>
            </div>
            <nav class="list-body">
              <connection-list-item
                v-for="c in usedConfigs"
                :key="c.id"
                :config="c"
                :selected-config="selectedConfig"
                :is-recent-list="true"
                :show-duplicate="false"
                :privacy-mode="privacyMode"
                @edit="edit"
                @remove="removeUsedConfig"
                @doubleClick="connect"
              />
            </nav>
          </div>
        </div>
      </div>
    </div>
    <portal to="modals">
      <modal
        class="vue-dialog beekeeper-modal"
        name="connection-folder-modal"
        @closed="folderModalName = ''; folderModalItem = null; folderModalError = null"
        @opened="$nextTick(() => $refs.folderNameInput && $refs.folderNameInput.focus())"
        height="auto"
        :scrollable="true"
      >
        <form @submit.prevent="submitFolderModal">
          <div class="dialog-content" v-kbd-trap="true">
            <div class="dialog-c-title">{{ folderModalItem ? 'Rename Folder' : folderModalParentId ? 'New Subfolder' : 'New Folder' }}</div>
            <div class="form-group">
              <label>Folder Name</label>
              <input
                ref="folderNameInput"
                v-model="folderModalName"
                type="text"
                placeholder="Folder name"
                @input="folderModalError = null"
                @keydown.esc.prevent="$modal.hide('connection-folder-modal')"
              >
            </div>
            <div class="form-group" v-if="isCloud && !folderModalItem && rootFolders.length > 0">
              <label>Parent Folder</label>
              <select v-model="folderModalParentId" @change="folderModalError = null">
                <option v-for="f in rootFolders" :key="f.id" :value="f.id">{{ f.name }}</option>
              </select>
            </div>
            <error-alert v-if="folderModalError" :error="folderModalError" />
          </div>
          <div class="vue-dialog-buttons flex-between">
            <span class="left" />
            <span class="right">
              <button class="btn btn-flat" type="button" @click.prevent="$modal.hide('connection-folder-modal')">Cancel</button>
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
import _ from 'lodash'
import { SmartLocalStorage } from '@/common/LocalStorage'
import WorkspaceSidebar from './WorkspaceSidebar.vue'
import { mapState, mapGetters, mapActions } from 'vuex'
import ConnectionListItem from './connection/ConnectionListItem.vue'
import SidebarLoading from '@/components/common/SidebarLoading.vue'
import ErrorAlert from '@/components/common/ErrorAlert.vue'
import Split from 'split.js'
import SidebarFolder from '@/components/common/SidebarFolder.vue'
import { AppEvent } from '@/common/AppEvent'
import rawLog from '@bksLogger'
import SidebarSortButtons from '../common/SidebarSortButtons.vue'
import Draggable from 'vuedraggable'
import Noty from 'noty'

const log = rawLog.scope('connection-sidebar');

export default {
  components: {
    ConnectionListItem,
    SidebarLoading,
    ErrorAlert,
    SidebarFolder,
    SidebarSortButtons,
    WorkspaceSidebar,
    Draggable
  },
  props: ['selectedConfig'],
  data: () => ({
    split: null,
    sortables: {
      labelColor: "Color",
      id: "Created",
      name: "Name",
      connectionType: "Type",
    },
    sort: { field: 'name', order: 'asc' },
    sortInitialized: false,
    sizes: [33, 33, 33],
    folderModalName: '',
    folderModalItem: null,
    folderModalParentId: null,
    folderModalError: null,
    folderModalSubmitting: false,
    folderExpandedState: {},
    draggingConnection: null
  }),
  watch: {
    async sort(newSort) {
      await this.$settings.set('connectionsSortOrder', newSort.order)
      await this.$settings.set('connectionsSortBy', newSort.field)
      if (!this.sortInitialized) return
      await this.reorderBySort(newSort)
    },
  },
  computed: {
    ...mapState('data/connections', {
      connectionsLoading: 'loading',
      connectionsError: 'error',
      connectionFilter: 'filter',
      pendingSaveIds: 'pendingSaveIds'
    }),
    ...mapState('data/connectionFolders', {
      folders: 'items',
      foldersLoading: 'loading',
      foldersError: 'error',
    }),
    ...mapGetters({
      usedConfigs: 'data/usedconnections/orderedUsedConfigs',
      settings: 'settings/settings',
      isCloud: 'isCloud',
      isUltimate: 'isUltimate',
      activeWorkspaces: 'credentials/activeWorkspaces',
      pinnedConnections: 'pinnedConnections/pinnedConnections',
      filteredConnections: 'data/connections/filteredConnections',
      privacyMode: 'settings/privacyMode'
    }),
    connFilter: {
      get() {
        return this.connectionFilter;
      },
      set(newFilter) {
        this.$store.dispatch('data/connections/setConnectionFilter', newFilter);
      }
    },
    empty() {
      return !this.filteredConnections?.length
    },
    noPins() {
      return !this.pinnedConnections?.length;
    },
    rootFolders() {
      return this.folders.filter((f) => !f.parentId).sort((a, b) => a.name.localeCompare(b.name))
    },
    lonelyConnections() {
      const folderIds = this.folders.map((c) => c.id)
      return [...this.filteredConnections]
        .filter((config) => !config.connectionFolderId || !folderIds.includes(config.connectionFolderId))
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    },
    foldersWithConnections() {
      if (this.loading) return []
      return this.$store.getters['data/connectionFolders/foldersWithConnections'](this.sortedConnections)
    },
    loading() {
      return this.connectionsLoading || this.foldersLoading
    },
    error: {
      get() {
        return this.connectionsError || this.foldersError || null
      },
      set(value) {
        if (!value) {
          this.$store.dispatch('data/connections/clearError');
          this.$store.dispatch('data/connectionFolders/clearError')
        } else {
          log.warn("Unable to set an actual error, sorry")
        }
      }
    },
    sortedConnections() {
      let result = []
      if (this.sort.field === 'labelColor') {
        const mappings = {
          default: -1,
          red: 0,
          orange: 1,
          yellow: 2,
          green: 3,
          blue: 4,
          purple: 5,
          pink: 6
        }
        result = _.orderBy(this.filteredConnections, (c) => mappings[c.labelColor])
      } else {
        result = _.orderBy(this.filteredConnections, this.sort.field)
      }
      if (this.sort.order === 'desc') result = result.reverse()
      return result;
    },
  },
  async mounted() {
    this.folderExpandedState = SmartLocalStorage.getJSON('connectionFolderExpanded-v1', {})
    this.buildSplit()
    const [field, order] = await Promise.all([
      this.$settings.get('connectionsSortBy', 'name'),
      this.$settings.get('connectionsSortOrder', 'asc')
    ]);
    this.sort.field = field
    this.sort.order = order
    this.$nextTick(() => { this.sortInitialized = true })
  },
  methods: {
    getFolderExpanded(folderId) {
      const stored = this.folderExpandedState[folderId]
      return stored !== undefined ? stored : true
    },
    onFolderToggle(folderId, expanded) {
      this.$set(this.folderExpandedState, folderId, expanded)
      SmartLocalStorage.addItem('connectionFolderExpanded-v1', this.folderExpandedState)
    },
    clearFilter() {
      this.connFilter = null;
    },
    buildSplit() {
      if (this.split) this.split.destroy()
      const components = [
        this.$refs.pinnedConnectionList,
        this.$refs.savedConnectionList,
        this.$refs.recentConnectionList
      ];
      this.split = Split(components, {
        elementStyle: (dim, size) => ({
          'flex-basis': `calc(${size}%)`
        }),
        direction: 'vertical',
        sizes: this.sizes
      })
    },
    importFromLocal() {
      console.log("triggering import")
      this.$root.$emit(AppEvent.promptConnectionImport)
    },
    async refresh() {
      await this.$store.dispatch('refreshConnections')
    },
    edit(config) {
      this.$emit('edit', config)
    },
    connect(config) {
      this.$emit('connect', config)
    },
    remove(config) {
      this.$emit('remove', config)
    },
    duplicate(config) {
      this.$emit('duplicate', config)
    },
    removeUsedConfig(config) {
      this.$store.dispatch('data/usedconnections/remove', config)
    },
    getLabelClass(color) {
      return `label-${color}`
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
      this.$modal.show('connection-folder-modal')
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
        { name: 'Rename', handler: ({ item }) => this.renameFolder(item) },
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
      this.$modal.show('connection-folder-modal')
    },
    showLonelyContextMenu(event) {
      this.$bks.openMenu({
        event,
        item: null,
        options: [{ name: 'New Folder', handler: () => this.createFolder() }]
      })
    },
    renameFolder(folder) {
      this.folderModalName = folder.name
      this.folderModalItem = folder
      this.folderModalError = null
      this.$modal.show('connection-folder-modal')
    },
    async moveFolderToParent(folder, newParent) {
      await this.$store.dispatch('data/connectionFolders/save', { ...folder, parentId: newParent.id })
    },
    async deleteFolder(folder) {
      if (await this.$confirm(`Delete folder "${folder.name}"?`)) {
        try {
          await this.$store.dispatch('data/connectionFolders/remove', folder)
        } catch (e) {
          this.$noty.error(e.message)
        }
      }
    },
    applySortOrder(connections, sort) {
      let result
      if (sort.field === 'labelColor') {
        const mappings = { default: -1, red: 0, orange: 1, yellow: 2, green: 3, blue: 4, purple: 5, pink: 6 }
        result = _.orderBy(connections, (c) => mappings[c.labelColor] ?? -1)
      } else {
        result = _.orderBy(connections, sort.field)
      }
      return sort.order === 'desc' ? result.reverse() : result
    },
    async reorderBySort(sort) {
      // Snapshot current state for undo
      const snapshot = this.filteredConnections.map((c) => ({ ...c }))

      // Sort all connections by the chosen field
      const sorted = this.applySortOrder(this.filteredConnections, sort)

      // Assign sequential 1-based positions within each folder/lonely group
      const groups = {}
      for (const c of sorted) {
        const key = c.connectionFolderId ?? '__lonely__'
        if (!groups[key]) groups[key] = []
        groups[key].push(c)
      }
      const updates = []
      for (const group of Object.values(groups)) {
        group.forEach((item, idx) => {
          updates.push({ ...item, position: idx + 1 })
        })
      }

      try {
        await this.$store.dispatch('data/connections/saveMany', updates)
        const n = new Noty({
          text: `Connections reordered by ${this.sortables[sort.field]}`,
          type: 'info',
          timeout: 8000,
          layout: 'bottomRight',
          theme: 'mint',
          closeWith: ['button'],
          buttons: [
            Noty.button('Undo', 'btn btn-sm', () => {
              this.$store.dispatch('data/connections/saveMany', snapshot)
              n.close()
            })
          ]
        })
        n.show()
      } catch (ex) {
        this.$noty.error(`Reorder error: ${ex.message}`)
      }
    },
    onConnectionDragStart(event, list) {
      this.draggingConnection = list[event.oldIndex]
    },
    cloudRelativePosition(list, newIndex) {
      const prev = list[newIndex - 1]
      const next = list[newIndex + 1]
      if (prev) return { after: prev.id }
      if (next) return { before: next.id }
      return { before: null }
    },
    async onConnectionFolderHeaderDrop(folder) {
      if (!this.draggingConnection) return
      try {
        // Use reorder action for both local and cloud workspaces
        await this.$store.dispatch('data/connections/reorder', {
          item: this.draggingConnection,
          connectionFolderId: folder.id,
          position: { before: null }
        })
      } catch (ex) {
        this.$noty.error(`Move error: ${ex.userMessage ?? ex.message}`)
      }
    },
    async onConnectionDrop(event, folder, currentList) {
      try {
        if (event.added) {
          const { element: item, newIndex } = event.added
          // Use reorder action for both local and cloud workspaces
          await this.$store.dispatch('data/connections/reorder', {
            item,
            connectionFolderId: folder?.id ?? null,
            position: this.cloudRelativePosition(currentList, newIndex)
          })
        } else if (event.moved) {
          const { element: item, newIndex } = event.moved
          // Use reorder action for both local and cloud workspaces
          await this.$store.dispatch('data/connections/reorder', {
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
          await this.$store.dispatch('data/connectionFolders/save', { ...this.folderModalItem, name })
        } else {
          await this.$store.dispatch('data/connectionFolders/save', { id: null, name, parentId: this.folderModalParentId ?? null })
        }
        this.$modal.hide('connection-folder-modal')
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
.folder-drop-zone {
  min-height: 8px;
}
.drag-pending {
  opacity: 0.5;
}
</style>
