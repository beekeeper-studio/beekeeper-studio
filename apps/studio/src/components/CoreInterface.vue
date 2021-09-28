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
        initializing: false
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
    mounted() {
      // only a dev problem with hot reloading
      if (!this.$store.hasModule('data/queries')) {
        this.$store.unregisterModule('data/queries')
      }

      if (this.$store.state.workspace.type === 'local') {
        this.$store.registerModule('data/queries', LocalQueryModule)
      } else {
        this.$store.registerModule('data/queries', CloudQueryModule)
      }
      this.$store.dispatch('updateHistory')
      this.$store.dispatch('data/queries/load')
      this.$store.dispatch('pins/loadPins')
      this.registerHandlers(this.rootBindings)
      this.initializing = false
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

    },
    beforeDestroy() {
      this.$store.unregisterModule('data/queries')
      this.$store.dispatch('pins/unloadPins')
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
