<template>
  <div id="interface" class="interface" v-hotkey="keymap">
    <div v-if="initializing">
      <progress-bar />
    </div>
    <div v-else class="interface-wrap row">
      <sidebar ref="sidebar" :class="{hide: !sidebarShown}">
        <core-sidebar @databaseSelected="databaseSelected" @toggleSidebar="toggleSidebar" :connection="connection" :sidebarShown="sidebarShown"></core-sidebar>
        <statusbar>
          <ConnectionButton></ConnectionButton>
        </statusbar>
      </sidebar>
      <div ref="content" class="page-content flex-col" id="page-content">
        <core-tabs :connection="connection"></core-tabs>
      </div>
    </div>
    <quick-search v-if="quickSearchShown" @close="quickSearchShown=false" />
    <ExportManager :connection="connection"></ExportManager>
  </div>
</template>

<script>
  import Sidebar from './common/Sidebar'
  import CoreSidebar from './sidebar/CoreSidebar'
  import CoreTabs from './CoreTabs'
  import Split from 'split.js'
  import Statusbar from './common/StatusBar'
  import ConnectionButton from './sidebar/core/ConnectionButton'
  import ExportManager from './export/ExportManager'
  import {AppEvent} from '../common/AppEvent'
  import QuickSearch from './quicksearch/QuickSearch.vue'
  import { LocalQueryModule } from '@/store/modules/data/query/LocalQueryModule'
  import ProgressBar from './editor/ProgressBar.vue'
  import { CloudQueryModule } from '@/store/modules/data/query/CloudQueryModule'
  export default {
    components: { CoreSidebar, CoreTabs, Sidebar, Statusbar, ConnectionButton, ExportManager, QuickSearch, ProgressBar},
    props: [ 'connection' ],
    data() {
      return {
        split: null,
        sidebarShown: true,
        quickSearchShown: false,
        rootBindings: [
          { event: AppEvent.quickSearch, handler: this.showQuickSearch},
          { event: AppEvent.toggleSidebar, handler: this.toggleSidebar }
        ],
        initializing: true
      }
    },
    computed: {
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
          this.split = Split(this.splitElements, {
            elementStyle: (dimension, size) => ({
                'flex-basis': `calc(${size}%)`,
            }),
            sizes: [25,75],
            minSize: 280,
            expandToMin: true,
            gutterSize: 5,
          })
        })
      }
    },
    mounted() {

      this.$store.dispatch('updateHistory')
      this.$store.dispatch('pins/loadPins')
      this.registerHandlers(this.rootBindings)
      this.$nextTick(() => {
        this.initializing = false
      })

    },
    beforeDestroy() {
      this.$store.dispatch('pins/unloadPins')
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
        this.sidebarShown = !this.sidebarShown
      },
    }
  }

</script>
