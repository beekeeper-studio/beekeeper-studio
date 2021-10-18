<template>
  <div class="sidebar-wrap row">
    <workspace-sidebar></workspace-sidebar>

    <!-- QUICK CONNECT -->
    <div class="tab-content flex-col expand">
      <div class="btn-wrap quick-connect">
        <a
          href=""
          class="btn btn-flat btn-icon btn-block"
          :class="{'active': defaultConfig == selectedConfig }"
          @click.prevent="edit(defaultConfig)"
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
                  Saved <span class="badge">{{connectionConfigs.length}}</span>
                </div>
                <span class="expand"></span>
                <div class="actions">
                  <a><i class="material-icons">refresh</i></a>
                </div>
                <x-button class="actions-btn btn btn-link btn-small" title="Sort By">
                  <!-- <span>{{sortables[this.sortOrder]}}</span> -->
                  <i class="material-icons-outlined">filter_alt</i>
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
            <error-alert :error="error" v-if="error" title="Problem loading connections" />
            <sidebar-loading v-else-if="loading" />
            <nav v-else class="list-body">
              <connection-list-item
                v-for="c in orderedConnectionConfigs"
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
  export default {
    components: { ConnectionListItem, WorkspaceSidebar, SidebarLoading, ErrorAlert },
    props: ['defaultConfig', 'selectedConfig'],
    data: () => ({
      split: null,
      sizes: [25,75],
      sortables: {
        labelColor: "Color",
        id: "Created",
        name: "Name",
        connectionType: "Type"
      }
    }),
    computed: {
      ...mapState('data/connections', {'connectionConfigs': 'items', 'loading': 'loading', 'error': 'error'}),
      ...mapGetters({
        'usedConfigs': 'orderedUsedConfigs',
        'settings': 'settings/settings',
        'sortOrder': 'settings/sortOrder'
      }),
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
        this.settings.sortOrder.userValue = by
        this.settings.sortOrder.save()
      }
    }
  }
</script>
