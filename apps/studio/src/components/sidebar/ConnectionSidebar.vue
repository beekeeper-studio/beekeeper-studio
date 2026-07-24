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
            <nav
              v-else
              class="list-body"
            >
              <tree
                :folders="draftingFolder ? folderNodesWithDraft : folderNodes"
                :items="sortedItemNodes"
                :expanded-ids="expandedIds"
                :filter="connFilter"
                @update:expandedIds="setExpandedIds"
                @bks-tree-node-move="handleTreeNodeMove"
              >
                <template #empty>
                  <div class="empty">
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
                <template #item="{ node }">
                  <connection-list-item
                    :config="node.ref"
                    :selected-config="selectedConfig"
                    :is-recent-list="false"
                    :privacy-mode="privacyMode"
                    @edit="edit"
                    @remove="removeUsedConfig"
                    @doubleClick="connect"
                  />
                </template>
              </tree>
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
import { AppEvent } from '@/common/AppEvent'
import { Tree, TreeFolder } from "@beekeeperstudio/ui-kit/vue/tree";
import rawLog from '@bksLogger'
import SidebarSortButtons from '../common/SidebarSortButtons.vue'
import EditableText from '@/components/common/EditableText.vue'
import Noty from 'noty'

const log = rawLog.scope('connection-sidebar');

export default {
  components: {
    ConnectionListItem,
    SidebarLoading,
    ErrorAlert,
    Tree,
    TreeFolder,
    EditableText,
    SidebarSortButtons,
    WorkspaceSidebar,
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
    expandedIds: [],
    draggingConnection: null,
    renamingFolderId: null,
    draftingFolder: false,
    draftFolderParentId: null,
  }),
  watch: {
    async sort(newSort) {
      await this.$settings.set('connectionsSortOrder', newSort.order)
      await this.$settings.set('connectionsSortBy', newSort.field)
      if (!this.sortInitialized) return
      await this.reorderBySort(newSort)
    },
    workspaceId() {
      this.restoreExpandedIds()
    },
    loading() {
      if (this.loading) {
        return;
      }
      if (SmartLocalStorage.exists(this.expandedStorageKey)) {
        return;
      }
      this.seedExpandedIds();
    },
  },
  computed: {
    ...mapState(['workspaceId']),
    ...mapState('data/connections', {
      connectionsLoading: 'loading',
      connectionsError: 'error',
      connectionFilter: 'filter',
      pendingSaveIds: 'pendingSaveIds',
    }),
    ...mapState('data/connectionFolders', {
      folders: 'items',
      foldersLoading: 'loading',
      foldersError: 'error',
    }),
    ...mapGetters({
      folderNodes: 'data/connectionFolders/nodes',
      itemNodes: 'data/connections/nodes',
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
    // v1 was a single workspace-agnostic map, so its expanded state can't be
    // attributed to a workspace — it is dropped rather than migrated.
    expandedStorageKey() {
      return `connectionFolderExpanded-v2-${this.workspaceId}`;
    },
    noPins() {
      return !this.pinnedConnections?.length;
    },
    rootFolders() {
      return this.folders.filter((f) => !f.parentId).sort((a, b) => a.name.localeCompare(b.name))
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
    sortedItemNodes() {
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
        result = _.orderBy(this.itemNodes, (n) => mappings[n.ref.labelColor])
      } else {
        result = _.orderBy(this.itemNodes, `ref.${this.sort.field}`)
      }
      if (this.sort.order === 'desc') result = result.reverse()
      return result;
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
  async mounted() {
    SmartLocalStorage.remove('connectionFolderExpanded-v1')
    this.restoreExpandedIds()
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
    ...mapActions({
      moveConnectionFolder: 'data/connectionFolders/move',
      moveConnection: 'data/connections/move',
    }),
    setExpandedIds(expandedIds) {
      this.expandedIds = expandedIds
      SmartLocalStorage.addItem(this.expandedStorageKey, expandedIds)
    },
    restoreExpandedIds() {
      this.expandedIds = SmartLocalStorage.getJSON(this.expandedStorageKey) ?? []
    },
    seedExpandedIds() {
      const ids = new Set(this.expandedIds);
      for (const folder of this.rootFolders) {
        ids.add(`folder-${folder.id}`)
      }
      this.expandedIds = [...ids];
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
      if (this.isCloud) {
        // Find personal folder
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
    expandFolder(folderId) {
      const nodeId = `folder-${folderId}`
      if (this.expandedIds.includes(nodeId)) {
        return
      }
      this.setExpandedIds([...this.expandedIds, nodeId])
    },
    /** @param folder {import("@/common/interfaces/ISavedQuery").default} */
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
            handler: ({ item }) => this.renameFolder(item),
            hideIf: !canWrite,
          },
          {
            name: 'Move',
            handler: ({ item }) => this.trigger(AppEvent.openMoveFileModal, { type: 'connectionFolder', value: item }),
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
    async handleTreeNodeMove({ source, target, position }) {
      try {
        if (source.type === 'folder') {
          // Folders have no ordering, so they land inside whatever folder the drop points at
          let targetId = target.ref.connectionFolderId ?? null
          if (target.type === 'folder') {
            targetId = target.ref.id
          }
          await this.moveConnectionFolder({ sourceId: source.ref.id, targetId, position: 'inside' })
        } else {
          await this.moveConnection({ sourceId: source.ref.id, targetId: target.ref.id, position })
        }
      } catch (ex) {
        if(ex.message.includes("[team_folder_in_personal_tree]")) {
          this.$noty.error(
            "You can't move this to your personal folder because it is shared with other workspace members."
          );
        } else {
          this.$noty.error(`Move error: ${ex.userMessage ?? ex.message}`)
        }
      }
    },
    share(folder) {
      this.trigger(AppEvent.openShareModal, {
        id: folder.id,
        module: "data/connectionFolders",
      });
    },
    renameFolder(folder) {
      this.renamingFolderId = folder.id
    },
    async submitFolderRename(folder, name) {
      if (!name || name === folder.name) {
        this.renamingFolderId = null
        return
      }
      try {
        await this.$store.dispatch('data/connectionFolders/save', { ...folder, name })
      } catch (ex) {
        this.$noty.error(`Rename error: ${ex.userMessage ?? ex.message}`)
      } finally {
        this.renamingFolderId = null
      }
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
    async submitDraftFolder(name) {
      if (!name) {
        this.cancelDraftFolder()
        return
      }
      try {
        await this.$store.dispatch('data/connectionFolders/save', {
          id: null,
          parentId: this.draftFolderParentId,
          name,
        })
      } catch (ex) {
        this.$noty.error(`Create folder error: ${ex.userMessage ?? ex.message}`)
      } finally {
        this.cancelDraftFolder()
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
</style>
