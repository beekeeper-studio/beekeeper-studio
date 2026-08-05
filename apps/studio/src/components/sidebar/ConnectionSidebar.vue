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
            <sidebar-loading v-else-if="initializing" />
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
                    v-if="!isCloud"
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
            <expired-folder-alert
              v-if="!canCreateFolders && folders.length > 0"
            />
            <error-alert
              :error="error"
              v-if="error"
              title="Problem loading connections"
              @close="error = null"
              :closable="true"
            />
            <sidebar-loading v-else-if="initializing" />
            <nav
              v-else
              class="list-body"
            >
              <template v-if="cloudSearchMode">
                <div class="empty-state"
                  v-if="!searchInProgress && filteredConnections.length === 0"
                >
                  No connections match "{{ connFilter }}"
                </div>
                <connection-list-item
                  v-for="c in filteredConnections"
                  :key="c.id"
                  :config="c"
                  :selected-config="selectedConfig"
                  :show-duplicate="true"
                  :pinned="pinnedConnections.includes(c)"
                  :is-recent-list="false"
                  :privacy-mode="privacyMode"
                  @edit="edit"
                  @remove="remove"
                  @duplicate="duplicate"
                  @doubleClick="connect"
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
                :folders="folderNodes"
                :items="sortedItemNodes"
                :expanded-ids="expandedNodeIds"
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
                  <connection-list-item
                    :config="node.ref"
                    :selected-config="selectedConfig"
                    :show-duplicate="true"
                    :pinned="pinnedConnectionIds.includes(node.ref.id)"
                    :is-recent-list="false"
                    :privacy-mode="privacyMode"
                    :class="{ 'drag-pending': (pendingSaveIds || []).includes(node.ref.id) }"
                    @edit="edit"
                    @remove="remove"
                    @duplicate="duplicate"
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
import WorkspaceSidebar from './WorkspaceSidebar.vue'
import { mapState, mapGetters, mapActions, mapMutations } from 'vuex'
import ConnectionListItem from './connection/ConnectionListItem.vue'
import SidebarLoading from '@/components/common/SidebarLoading.vue'
import ContentPlaceholder from '@/components/common/loading/ContentPlaceholder.vue'
import ContentPlaceholderText from '@/components/common/loading/ContentPlaceholderText.vue'
import ErrorAlert from '@/components/common/ErrorAlert.vue'
import ExpiredFolderAlert from '@/components/common/ExpiredFolderAlert.vue'
import Split from 'split.js'
import { AppEvent } from '@/common/AppEvent'
import { Tree, TreeFolder } from "@beekeeperstudio/ui-kit/vue/tree";
import rawLog from '@bksLogger'
import SidebarSortButtons from '../common/SidebarSortButtons.vue'
import EditableText from '@/components/common/EditableText.vue'
import Noty from 'noty'
import { parseReorderTarget } from '@/common/utils/folderTree'

const log = rawLog.scope('connection-sidebar');

export default {
  components: {
    ConnectionListItem,
    SidebarLoading,
    ContentPlaceholder,
    ContentPlaceholderText,
    ErrorAlert,
    Tree,
    TreeFolder,
    EditableText,
    ExpiredFolderAlert,
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
    renamingFolderId: null,
    justCreatedFolderId: null,
    justCreatedTimeout: null,
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
    ...mapState('data/connections/nodes', { itemNodes: 'items' }),
    ...mapState('data/connectionFolders/nodes', { folderNodes: 'items' }),
    ...mapState('data/connections', {
      connectionsError: 'error',
      connectionFilter: 'filter',
      pendingSaveIds: 'pendingSaveIds',
      searchInProgress: 'searching',
    }),
    ...mapState('data/connectionFolders', {
      folders: 'items',
      foldersLoading: 'loading',
      foldersError: 'error',
      draft: 'draft',
    }),
    ...mapState('sidebar/connections', {
      expandedFolderIds: 'expandedIds',
    }),
    ...mapState({
      loadingFolderIds(state) {
        return [
          ...state["data/connectionFolders"].folders.fetchingIds,
          ...state["data/connections"].folders.fetchingIds,
        ];
      },
    }),
    ...mapGetters({
      usedConfigs: 'data/usedconnections/orderedUsedConfigs',
      settings: 'settings/settings',
      isCloud: 'isCloud',
      isUltimate: 'isUltimate',
      canCreateFolders: 'canCreateFolders',
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
    expandedNodeIds() {
      return this.expandedFolderIds.map((id) => `folder-${id}`);
    },
    pinnedConnectionIds() {
      return this.pinnedConnections.map((pinned) => pinned.id);
    },
    // Cloud lazy-loads folder contents, so a match can live in a folder that was
    // never fetched. Searching hits the server and shows a flat result list.
    cloudSearchMode() {
      return this.isCloud && !!this.connFilter;
    },
    initializing() {
      return this.folders.length === 0 && this.foldersLoading;
    },
    noPins() {
      return !this.pinnedConnections?.length;
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
      // Cloud has no sort buttons — drag and drop is the only way to reorder,
      // and it lands in `position`.
      if (this.isCloud) {
        return _.sortBy(this.itemNodes, 'ref.position')
      }
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
  },
  async mounted() {
    this.buildSplit()
    const [field, order] = await Promise.all([
      this.$settings.get('connectionsSortBy', 'name'),
      this.$settings.get('connectionsSortOrder', 'asc')
    ]);
    this.sort.field = field
    this.sort.order = order
    this.$nextTick(() => { this.sortInitialized = true })
  },
  beforeDestroy() {
    clearTimeout(this.justCreatedTimeout)
  },
  methods: {
    ...mapActions({
      saveFolder: 'data/connectionFolders/save',
      reorderConnection: 'data/connections/reorder',
      ensureConnectionsLoaded: 'data/connections/ensureLoaded',
      ensureSubfoldersLoaded: 'data/connectionFolders/ensureLoaded',
      startDrafting: 'data/connectionFolders/startDrafting',
      stopDrafting: 'data/connectionFolders/stopDrafting',
    }),
    ...mapMutations({
      setExpandedFolderIds: 'sidebar/connections/expandedIds',
    }),
    setExpandedIds(expandedNodeIds) {
      const folderIds = this.folderNodes
        .filter((node) => expandedNodeIds.includes(node.id))
        .map((node) => node.ref.id)
      this.setExpandedFolderIds(folderIds)
      this.ensureConnectionsLoaded(folderIds)
      this.ensureSubfoldersLoaded(folderIds)
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
      if (!this.canCreateFolders) {
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
        this.startDrafting(parent.id);
        this.expandFolder(parent.id);
      } else {
        this.startDrafting(null);
      }
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
            handler: ({ item }) => this.renameFolder(item),
            hideIf: !canWrite,
          },
          {
            name: 'Move',
            handler: ({ item }) => this.trigger(AppEvent.openMoveFolderModal, { type: 'connectionFolder', value: item }),
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
          await this.reorderConnection({
            item: source.ref,
            connectionFolderId: parentId,
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
    async commitDraft(name = "") {
      if (!name.trim()) {
        this.stopDrafting()
        return
      }
      try {
        const id = await this.$store.dispatch('data/connectionFolders/save', {
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
  }
}
</script>

<style lang="scss" scoped>
.drag-pending {
  opacity: 0.5;
}
.tree-loading {
  margin-block: 0.5rem;
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
::v-deep .alert.expired-folder-alert {
  margin-inline: 0.8rem;
}

.empty-state {
  padding-top: 0.25rem;
  padding-left: 0.5rem;
  font-size: 0.85rem;
}
</style>
