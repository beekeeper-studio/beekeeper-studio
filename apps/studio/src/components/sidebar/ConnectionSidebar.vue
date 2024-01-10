<template>
  <div class="sidebar-wrap row">
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
        <!-- Pinned Connections -->
        <!-- TODO (day): should probably make a class for pinned connections-->
        <div
          class="list saved-connection-list expand"
          ref="pinnedConnectionList"
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

        <hr v-if="!noPins"> <!-- fake gutter for split.js -->

        <!-- Saved Connections -->
        <div
          class="list saved-connection-list expand"
          ref="savedConnectionList"
        >
          <div class="list-group">
            <div class="list-heading">
              <div class="flex">
                <div class="sub row flex-middle noselect">
                  Saved <span class="badge">{{ (connectionConfigs || []).length }}</span>
                </div>
                <span class="expand" />
                <div class="actions">
                  <a
                    v-if="isCloud"
                    @click.prevent="importFromLocal"
                    title="Import connections from local workspace"
                  ><i class="material-icons">save_alt</i></a>
                  <a
                    @click.prevent="refresh"
                    v-tooltip="`Refresh`"
                  ><i class="material-icons">refresh</i></a>
                  <a
                    @click.prevent="createFolder"
                    v-tooltip="`Create new folder`"
                  ><i class="material-icons-outlined">create_new_folder</i></a>
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
              <saved-connection-tree
                ref="savedConnectionTree"
                :selected-config="selectedConfig"
                :sort="sort"
                @edit:connection="edit"
                @remove:connection="remove"
                @duplicate:connection="duplicate"
                @doubleClick:connection="connect"
              />
            </nav>
          </div>
        </div>

        <hr> <!-- Fake gutter for split.js -->

        <!-- Recent Connections -->
        <div
          class="list recent-connection-list expand"
          ref="recentConnectionList"
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
  import { mapState, mapGetters } from 'vuex'
  import ConnectionListItem from './connection/ConnectionListItem'
  import SidebarLoading from '@/components/common/SidebarLoading.vue'
  import ErrorAlert from '@/components/common/ErrorAlert.vue'
  import Split from 'split.js'
import { AppEvent } from '@/common/AppEvent'
import rawLog from 'electron-log'
import SidebarSortButtons from '../common/SidebarSortButtons.vue'
import Vue from 'vue'
import SavedConnectionTree from './SavedConnectionTree.vue'

const log = rawLog.scope('connection-sidebar');

  export default {
    components: { ConnectionListItem, SidebarLoading, ErrorAlert, SidebarSortButtons, SavedConnectionTree },
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
    }),
    watch: {
      async sort() {
        await this.$settings.set('connectionsSortOrder', this.sort.order)
        await this.$settings.set('connectionsSortBy', this.sort.field)
      },
      // If we load with some pins, this will reinitialize split to reflect that
      noPins(value) {
        if (!value)
          this.buildSplit()
      },
      // Check if we need to reinitialize split based on pinnedConnections length
      pinnedConnections(value) {
        if (value.length < 2)
          this.buildSplit()
      }
    },
    computed: {
      ...mapState('data/connections', {'connectionConfigs': 'items', 'connectionsLoading': 'loading', 'connectionsError': 'error'}),
      ...mapState('data/connectionFolders', { 'foldersLoading': 'loading', 'foldersError': 'error' }),
      ...mapGetters({
        'usedConfigs': 'orderedUsedConfigs',
        'settings': 'settings/settings',
        'isCloud': 'isCloud',
        'activeWorkspaces': 'credentials/activeWorkspaces',
        'pinnedConnections': 'pinnedConnections/pinnedConnections'
      }),
      empty() {
        return !this.connectionConfigs?.length
      },
      noPins() {
        return !this.pinnedConnections?.length;
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
          result = _.orderBy(this.connectionConfigs, (c) => mappings[c.labelColor])
        } else {
          result = _.orderBy(this.connectionConfigs, this.sort.field)
        }

        if (this.sort.order == 'desc') result = result.reverse()
        return result;
      },
      components() {
        if (!this.noPins) {
          return [
            this.$refs.pinnedConnectionList,
            this.$refs.savedConnectionList,
            this.$refs.recentConnectionList
          ]
        } else {
          return [
            this.$refs.savedConnectionList,
            this.$refs.recentConnectionList
          ]
        }
      }
    },
    async mounted() {
      this.buildSplit()
      const [field, order] = await Promise.all([
        this.$settings.get('connectionsSortBy', 'name'),
        this.$settings.get('connectionsSortOrder', 'asc')
      ])
      this.sort.field = field
      this.sort.order = order

      this.$refs.savedConnectionTree.refresh()
    },
    methods: {
      buildSplit() {
        if (this.split) this.split.destroy()
        this.split = Split(this.components, {
          elementStyle: (dim, size) => ({
            'flex-basis': `calc(${size}%)`
          }),
          direction: 'vertical',
          sizes: this.noPins ? [50, 50] : [33, 33, 33]
        })
      },
      importFromLocal() {
        this.$root.$emit(AppEvent.promptConnectionImport)
      },
      async refresh() {
        await this.$store.dispatch('data/connectionFolders/load')
        await this.$store.dispatch('data/connections/load')
        await this.$store.dispatch('pinnedConnections/loadPins');
        await this.$store.dispatch('pinnedConnections/reorder');

        this.$refs.savedConnectionTree.refresh()
      },
      async createFolder() {
        const { canceled, value } = await this.$prompt({
          title: "Create a new folder",
        })

        if (canceled) return

        await this.$store.dispatch('data/connectionFolders/create', { name: value })
        await this.$store.dispatch('data/connectionFolders/load')

        this.$refs.savedConnectionTree.refresh();
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
    }
  }
</script>
