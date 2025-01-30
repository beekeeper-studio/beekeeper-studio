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
                  ><i class="material-icons">save_alt</i></a>
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
                v-for="{ folder, connections } in foldersWithConnections"
                :key="`${folder.id}-${connections.length}`"
                :title="`${folder.name} (${connections.length})`"
                placeholder="No Items"
                :expanded-initially="true"
              >
                <connection-list-item
                  v-for="c in connections"
                  :key="c.id"
                  :config="c"
                  :selected-config="selectedConfig"
                  :show-duplicate="true"
                  :pinned="pinnedConnections.includes(c)"
                  @edit="edit"
                  @remove="remove"
                  @duplicate="duplicate"
                  @doubleClick="connect"
                />
              </sidebar-folder>
              <connection-list-item
                v-for="c in lonelyConnections"
                :key="c.id"
                :config="c"
                :selected-config="selectedConfig"
                :show-duplicate="true"
                :pinned="pinnedConnections.includes(c)"
                @edit="edit"
                @remove="remove"
                @duplicate="duplicate"
                @doubleClick="connect"
              />
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
import { mapState, mapGetters } from 'vuex'
import ConnectionListItem from './connection/ConnectionListItem.vue'
import SidebarLoading from '@/components/common/SidebarLoading.vue'
import ErrorAlert from '@/components/common/ErrorAlert.vue'
import Split from 'split.js'
import SidebarFolder from '@/components/common/SidebarFolder.vue'
import { AppEvent } from '@/common/AppEvent'
import rawLog from '@bksLogger'
import SidebarSortButtons from '../common/SidebarSortButtons.vue'

const log = rawLog.scope('connection-sidebar');

export default {
  components: { ConnectionListItem, SidebarLoading, ErrorAlert, SidebarFolder, SidebarSortButtons, WorkspaceSidebar },
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
    sizes: [33, 33, 33]
  }),
  watch: {
    async sort() {
      await this.$settings.set('connectionsSortOrder', this.sort.order)
      await this.$settings.set('connectionsSortBy', this.sort.field)
    },
  },
  computed: {
    ...mapState('data/connections', {'connectionsLoading': 'loading', 'connectionsError': 'error', 'connectionFilter': 'filter'}),
    ...mapState('data/connectionFolders', {'folders': 'items', 'foldersLoading': 'loading', 'foldersError': 'error', 'foldersUnsupported': 'unsupported'}),
    ...mapGetters({
      'usedConfigs': 'data/usedconnections/orderedUsedConfigs',
      'settings': 'settings/settings',
      'isCloud': 'isCloud',
      'activeWorkspaces': 'credentials/activeWorkspaces',
      'pinnedConnections': 'pinnedConnections/pinnedConnections',
      'filteredConnections': 'data/connections/filteredConnections'
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
    foldersSupported() {
      return !this.foldersUnsupported
    },
    lonelyConnections() {
      const folderIds = this.folders.map((c) => c.id)
      return this.sortedConnections.filter((config) => {
        return !config.connectionFolderId || !folderIds.includes(config.connectionFolderId)
      })
    },
    foldersWithConnections() {
      if (this.loading) return []

      const result = this.folders.map((folder) => {
        return {
          folder,
          connections: this.sortedConnections.filter((c) => c.connectionFolderId === folder.id)
        }
      })

      return result
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

      if (this.sort.order == 'desc') result = result.reverse()
      return result;
    },
  },
  async mounted() {
    this.buildSplit()
    const [field, order] = await Promise.all([
      this.$settings.get('connectionsSortBy', 'name'),
      this.$settings.get('connectionsSortOrder', 'asc')
    ])
    this.sort.field = field
    this.sort.order = order
  },
  methods: {
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
  }
}
</script>
