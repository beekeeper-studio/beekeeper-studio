<template>
  <div class="sidebar-wrap row">
    <workspace-sidebar v-if="activeWorkspaces.length"></workspace-sidebar>

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

      <div class="connection-wrap expand flex-col">

        <!-- Saved Connections -->
        <div class="list saved-connection-list expand" ref="savedConnectionList">
          <div class="list-group">
            <div class="list-heading">
              <div class="flex">
                <div class="sub row flex-middle noselect">
                  Saved <span class="badge">{{(connectionConfigs || []).length}}</span>
                </div>
                <span class="expand"></span>
                <div class="actions">
                  <a v-if="isCloud" @click.prevent="importFromLocal" title="Import connections from local workspace"><i class="material-icons">save_alt</i></a>
                  <a @click.prevent="refresh"><i class="material-icons">refresh</i></a>
                </div>
                <x-button class="actions-btn btn btn-link btn-small" title="Sort By">
                  <!-- <span>{{sortables[this.sortOrder]}}</span> -->
                  <i class="material-icons-outlined">sort</i>
                  <!-- <i class="material-icons">arrow_drop_down</i> -->
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
                </x-button>
              </div>
            </div>
            <error-alert :error="error" v-if="error" title="Problem loading connections" @close="error = null" :closable="true" />
            <sidebar-loading v-else-if="loading" />
            <div v-else-if="empty" class="empty">
              <div class="empty-title">No Saved Connections</div>
              <div class="empty-actions" v-if="isCloud">
                <a class="btn btn-flat btn-block btn-icon" @click.prevent="importFromLocal" title="Import connections from local workspace"><i class="material-icons">save_alt</i> Import</a>
              </div>
            </div>
            <nav v-else class="list-body">
              <sidebar-folder
                v-for="{ folder, connections } in foldersWithConnections"
                :key="`${folder.id}-${connections.length}`"
                :title="`${folder.name} (${connections.length})`"
                placeholder="No Items"
                :expandedInitially="true"
              >
                <connection-list-item
                  v-for="c in connections"
                  :key="c.id"
                  :config="c"
                  :selectedConfig="selectedConfig"
                  :showDuplicate="true"
                  @edit="edit"
                  @remove="remove"
                  @duplicate="duplicate"
                  @doubleClick="connect"
                >
                </connection-list-item>
              </sidebar-folder>
              <connection-list-item v-for="c in lonelyConnections"
                :key="c.id"
                :config="c"
                :selectedConfig="selectedConfig"
                :showDuplicate="true"
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
        <div class="list recent-connection-list expand" ref="recentConnectionList">
          <div class="list-group">
            <div class="list-heading">
              <div class="sub row flex-middle noselect">
                Recent <span class="badge">{{usedConfigs.length}}</span>
              </div>
            </div>
            <nav class="list-body">
                <connection-list-item
                  v-for="c in usedConfigs"
                  :key="c.id"
                  :config="c"
                  :selectedConfig="selectedConfig"
                  :isRecentList="true"
                  :showDuplicate="false"
                  @edit="edit"
                  @remove="removeUsedConfig"
                  @doubleClick="connect"
                >
                </connection-list-item>
            </nav>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
  import _ from 'lodash'
  import WorkspaceSidebar from './WorkspaceSidebar'
  import { mapState, mapGetters } from 'vuex'
  import ConnectionListItem from './connection/ConnectionListItem'
  import SidebarLoading from '@/components/common/SidebarLoading.vue'
  import ErrorAlert from '@/components/common/ErrorAlert.vue'
  import Split from 'split.js'
import SidebarFolder from '@/components/common/SidebarFolder.vue'
import { AppEvent } from '@/common/AppEvent'
import rawLog from 'electron-log'

const log = rawLog.scope('connection-sidebar');

  export default {
    components: { ConnectionListItem, WorkspaceSidebar, SidebarLoading, ErrorAlert, SidebarFolder },
    props: ['selectedConfig'],
    data: () => ({
      split: null,
      sizes: [50,50],
      sortables: {
        labelColor: "Color",
        id: "Created",
        name: "Name",
        connectionType: "Type"
      }
    }),
    watch: {
    },
    computed: {
      ...mapState('data/connections', {'connectionConfigs': 'items', 'connectionsLoading': 'loading', 'connectionsError': 'error'}),
      ...mapState('data/connectionFolders', {'folders': 'items', 'foldersLoading': 'loading', 'foldersError': 'error', 'foldersUnsupported': 'unsupported'}),
      ...mapGetters({
        'usedConfigs': 'orderedUsedConfigs',
        'settings': 'settings/settings',
        'sortOrder': 'settings/sortOrder',
        'isCloud': 'isCloud',
        'activeWorkspaces': 'credentials/activeWorkspaces'
      }),
      empty() {
        return !this.connectionConfigs?.length
      },
      foldersSupported() {
        return !this.foldersUnsupported
      },
      lonelyConnections() {
        const folderIds = this.folders.map((c) => c.id)
        return this.connectionConfigs.filter((config) => {
          return !config.connectionFolderId || !folderIds.includes(config.connectionFolderId)
        })
      },
      foldersWithConnections() {
        if (this.loading) return []

        const result = this.folders.map((folder) => {
          return {
            folder,
            connections: this.connectionConfigs.filter((c) => c.connectionFolderId === folder.id)
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
      orderedConnectionConfigs() {
        return _.orderBy(this.connectionConfigs, this.sortOrder)
      },
      components() {
        return [
          this.$refs.savedConnectionList,
          this.$refs.recentConnectionList
        ]
      }
    },
    mounted() {
      this.split = Split(this.components, {
        elementStyle: (dim, size) => ({
          'flex-basis': `calc(${size}%)`
        }),
        direction: 'vertical',
        sizes: this.sizes
      })
    },
    methods: {
      importFromLocal() {
        console.log("triggering import")
        this.$root.$emit(AppEvent.promptConnectionImport)
      },
      refresh() {
        this.$store.dispatch('data/connectionFolders/load')
        this.$store.dispatch('data/connections/load')
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
        this.$store.dispatch('removeUsedConfig', config)
      },
      getLabelClass(color) {
        return `label-${color}`
      },
      sortConnections(by) {
        this.connectionConfigs.sort((a, b) => a[by].toString().localeCompare(b[by].toString()))
        this.settings.sortOrder.userValue = by
        this.settings.sortOrder.save()
      }
    }
  }
</script>
