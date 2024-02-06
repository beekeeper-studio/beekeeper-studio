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
          :connection="connection"
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
        <core-tabs :connection="connection" />
      </div>
    </div>
    <quick-search
      v-if="quickSearchShown"
      @close="quickSearchShown=false"
    />
    <ExportManager :connection="connection" />
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
  import { DBConnection } from '@/lib/db/client'
  import Vue from 'vue'

  export default Vue.extend({
    components: { CoreSidebar, CoreTabs, Sidebar, Statusbar, ConnectionButton, ExportManager, QuickSearch, ProgressBar },
    props: {
      connection: DBConnection
    },
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
      keymap() {
        return this.$vHotkeyKeymap({
          'main.openQuickSearch': this.showQuickSearch
        })
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
            elementStyle: (_dimension, size) => ({
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
        this.sidebarShown = !this.sidebarShown
      },
    }
  })

</script>
