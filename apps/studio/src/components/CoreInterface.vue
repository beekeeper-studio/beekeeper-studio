<template>
  <div
    id="interface"
    class="interface"
    v-hotkey="keymap"
  >
    <div v-if="initializing">
      <progress-bar />
    </div>
    <div
      v-else
      class="interface-wrap row"
    >
      <sidebar
        ref="sidebar"
        :class="{hide: !sidebarShown}"
      >
        <core-sidebar
          @databaseSelected="databaseSelected"
          @toggleSidebar="toggleSidebar"
          :sidebar-shown="sidebarShown"
        />
        <statusbar>
          <ConnectionButton />
        </statusbar>
      </sidebar>
      <div
        ref="content"
        class="page-content flex-col"
        id="page-content"
      >
        <core-tabs />
      </div>
    </div>
    <quick-search
      v-if="quickSearchShown"
      @close="quickSearchShown=false"
    />
    <ExportManager />
    <lost-connection-modal />
    <rename-database-element-modal />
  </div>
</template>

<script lang="ts">
  import Sidebar from './common/Sidebar.vue'
  import CoreSidebar from './sidebar/CoreSidebar.vue'
  import CoreTabs from './CoreTabs.vue'
  import Split from 'split.js'
  import Statusbar from './common/StatusBar.vue'
  import ConnectionButton from './sidebar/core/ConnectionButton.vue'
  import ExportManager from './export/ExportManager.vue'
  import {AppEvent} from '../common/AppEvent'
  import QuickSearch from './quicksearch/QuickSearch.vue'
  import ProgressBar from './editor/ProgressBar.vue'
  import LostConnectionModal from './LostConnectionModal.vue'
  import Vue from 'vue'
  import { SmartLocalStorage } from '@/common/LocalStorage'
  import RenameDatabaseElementModal from './common/modals/RenameDatabaseElementModal.vue'
  import { mapGetters } from 'vuex'

  export default Vue.extend({
    components: { CoreSidebar, CoreTabs, Sidebar, Statusbar, ConnectionButton, ExportManager, QuickSearch, ProgressBar, LostConnectionModal, RenameDatabaseElementModal },
    data() {
      /* eslint-disable */
      return {
        split: null,
        sidebarShown: true,
        quickSearchShown: false,
        rootBindings: [
          // @ts-ignore
          { event: AppEvent.quickSearch, handler: this.showQuickSearch},
          // @ts-ignore
          { event: AppEvent.toggleSidebar, handler: this.toggleSidebar }
        ],
        initializing: true
      }
      /* eslint-enable */
    },
    computed: {
      ...mapGetters(['minimalMode']),
      keymap() {
        const results = {}
        results[this.ctrlOrCmd('p')] = () => this.quickSearchShown = true
        return results
      },
      splitElements() {
        return [
          this.$refs.sidebar.$refs.sidebar,
          this.$refs.content
        ]
      }
    },
    watch: {
      initializing() {
        if (this.initializing) return;
        this.$nextTick(() => {
          const lastSavedSplitSizes = SmartLocalStorage.getItem("interfaceSplitSizes")
          const splitSizes = lastSavedSplitSizes ? JSON.parse(lastSavedSplitSizes) : [25, 75]

          this.split = Split(this.splitElements, {
            elementStyle: (_dimension, size) => ({
                'flex-basis': `calc(${size}%)`,
            }),
            sizes: splitSizes,
            minSize: [25, 75],
            expandToMin: true,
            gutterSize: 5,
            onDragEnd: () => {
              const splitSizes = this.split.getSizes()
              SmartLocalStorage.addItem("interfaceSplitSizes", splitSizes)
            }
          })
        })
      },
      minimalMode() {
        if (this.minimalMode) {
          this.sidebarShown = true
        }
      },
    },
    mounted() {
      this.$store.dispatch('pins/loadPins')
      this.$store.dispatch('hideEntities/load')
      this.registerHandlers(this.rootBindings)
      this.$nextTick(() => {
        this.initializing = false
      })
    },
    beforeDestroy() {
      this.$store.dispatch('pins/unloadPins')
      this.$store.dispatch('hideEntities/unload')
      this.$store.commit('unloadTables')
      this.$store.commit('tabs/set', [])
      this.unregisterHandlers(this.rootBindings)
      if(this.split) {
        this.split.destroy()
      }
    },
    methods: {
      showQuickSearch() {
        this.quickSearchShown = true
      },
      databaseSelected(database) {
        this.$emit('databaseSelected', database)
      },
      toggleSidebar() {
        if (this.minimalMode) {
          // Always show sidebar (table list) in minimal mode
          this.sidebarShown = true
        } else {
          this.sidebarShown = !this.sidebarShown
        }
      },
    }
  })

</script>
