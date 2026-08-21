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
              v-if="error && !isPollError && !errorList.includes(error)"
              title="Problem loading connections"
              @close="error = null"
              :closable="true"
            />
            <sidebar-loading v-if="initializing" />
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
              v-if="error && !isPollError && !errorList.includes(error)"
              title="Problem loading connections"
              @close="error = null"
              :closable="true"
            />
            <sidebar-loading v-if="initializing" />
            <nav
              v-else
              class="list-body"
            >
              <template v-if="searching">
                <div class="empty-state"
                  v-if="!typing && !fetchingResults && filteredConnections.length === 0"
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
import { buildFolderNodes, parseReorderTarget } from '@/common/utils/folderTree'

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
    loadingFolderIds: [],
    errors: {},
    drafting: false,
    draftParentId: null,
    connFilter: "",
  }),
  watch: {
    async sort(newSort) {
      await this.$settings.set('connectionsSortOrder', newSort.order)
      await this.$settings.set('connectionsSortBy', newSort.field)
      if (!this.sortInitialized) return
      await this.reorderBySort(newSort)
    },
    connFilter(value) {
      this.setConnectionFilter(value);
    },
  },
  computed: {
    ...mapState('data/connections/nodes', { itemNodes: 'items' }),
    ...mapState('data/connectionFolders/nodes', { folderNodes: 'items' }),
    ...mapState('data/connections', {
      connectionsError: 'error',
      connectionsPollError: 'pollError',
      connectionFilter: 'filter',
      pendingSaveIds: 'pendingSaveIds',
      fetchingResults: 'searching',
    }),
    ...mapState('data/connectionFolders', {
      folders: 'items',
      foldersLoading: 'loading',
      foldersError: 'error',
      foldersPollError: 'pollError',
    }),
    ...mapState('sidebar/connections', {
      expandedFolderIds: 'expandedIds',
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
    typing() {
      return this.connFilter !== this.connectionFilter;
    },
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
    pinnedConnectionIds() {
      return this.pinnedConnections.map((pinned) => pinned.id);
    },
    searching() {
      return !!this.connFilter;
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
    pollError() {
      return this.connectionsPollError || this.foldersPollError || null
    },
    sortedItemNodes() {
      // Rendered order always comes from `position`. The sort buttons are a
      // one-shot action: `reorderBySort` rewrites `position` for every
      // connection and offers an undo. Deriving the rendered order from
      // `sort.field` here instead would permanently outrank `position`, so a
      // drag would save but never show.
      return _.sortBy(this.itemNodes, (n) => n.ref.position ?? 0)
    },
    errorList() {
      return Object.values(this.errors);
    },
    isPollError() {
      return (
        this.connectionsError === this.connectionsPollError ||
        this.foldersError === this.foldersPollError
      );
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
      loadConnections: 'data/connections/loadByParentIds',
      loadConnectionFolders: 'data/connectionFolders/loadByParentIds',
      unloadConnections: 'data/connections/unloadByParentIds',
      unloadConnectionFolders: 'data/connectionFolders/unloadByParentIds',
      setConnectionFilter: 'data/connections/setConnectionFilter',
    }),
    ...mapMutations({
      setExpandedFolderIds: 'sidebar/connections/expandedIds',
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
          this.loadConnections(ids),
          this.loadConnectionFolders(ids),
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
      this.unloadConnections(ids);
      this.unloadConnectionFolders(ids);
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
            connectionFolderId: parentId,
            position,
          };
          await this.reorderConnection(reorderPayload);
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
          await this.reorderConnection({ ...reorderPayload, confirm: true });
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
::v-deep .alert.expired-folder-alert {
  margin-inline: 0.8rem;
}

.empty-state {
  padding-top: 0.25rem;
  padding-left: 0.5rem;
  font-size: 0.85rem;
}
</style>
