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
        class="primary-sidebar"
        :style="{ '--sidebar-min-width': primarySidebarMinWidth + 'px' }"
      >
        <core-sidebar
          @databaseSelected="databaseSelected"
          @toggleSidebar="togglePrimarySidebar"
          :sidebar-shown="openPrimarySidebar"
        />
        <statusbar>
          <ConnectionButton />
        </statusbar>
      </sidebar>
      <div
        ref="content"
        class="page-content flex-col main-content"
        id="page-content"
      >
        <core-tabs />
      </div>
      <secondary-sidebar ref="secondarySidebar" @close="toggleSecondarySidebar(false)" />
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
  import SecondarySidebar from './sidebar/SecondarySidebar.vue'
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
  import { mapGetters, mapActions, mapState } from 'vuex'
  import _ from "lodash"

  export default Vue.extend({
    components: { CoreSidebar, CoreTabs, Sidebar, Statusbar, ConnectionButton, ExportManager, QuickSearch, ProgressBar, LostConnectionModal, RenameDatabaseElementModal, SecondarySidebar },
    data() {
      /* eslint-disable */
      return {
        split: null,
        quickSearchShown: false,
        initializing: true,
        primarySidebarMinWidth: 44,
      }
      /* eslint-enable */
    },
    computed: {
      ...mapGetters(['minimalMode', 'openPrimarySidebar']),
      ...mapState("secondarySidebar", {
        openSecondarySidebar: "open",
      }),
      keymap() {
        return this.$vHotkeyKeymap({
          'general.openQuickSearch': this.showQuickSearch
        })
      },
      splitElements() {
        return [
          this.$refs.sidebar.$refs.sidebar,
          this.$refs.content,
          this.$refs.secondarySidebar.$el
        ]
      },
      rootBindings() {
        return [
          { event: AppEvent.quickSearch, handler: this.showQuickSearch},
          { event: AppEvent.togglePrimarySidebar, handler: this.togglePrimarySidebar },
          { event: AppEvent.toggleSecondarySidebar, handler: this.toggleSecondarySidebar },
        ]
      },
    },
    watch: {
      initializing() {
        if (this.initializing) return;
        this.$nextTick(() => {
          const lastSavedSplitSizes = SmartLocalStorage.getItem("interfaceSplitSizes", "[35, 65, 0]")
          const splitSizes = JSON.parse(lastSavedSplitSizes)

          this.split = Split(this.splitElements, {
            snapOffset: [150, 0, 150],
            sizes: splitSizes,
            minSize: [this.primarySidebarMinWidth, 200, 0],
            gutterSize: 5,
            elementStyle: (_dimension, elementSize) => ({
              width: `calc(${elementSize}%)`,
            }),
            gutter: (_index, direction) => {
                const gutter = document.createElement('div')
                gutter.className = `gutter gutter-${direction}`
                return gutter
            },
            onDragEnd: () => {
              const splitSizes = this.split.getSizes()
              SmartLocalStorage.addItem("interfaceSplitSizes", splitSizes)

              // Handle primary sidebar collapse/expand
              const primarySidebar = this.splitElements[0]
              const threshold = this.primarySidebarMinWidth + 5

              if (primarySidebar.offsetWidth <= threshold) {
                this.togglePrimarySidebar(false, { preventResize: true })
              } else {
                this.togglePrimarySidebar(true, { preventResize: true })
              }

              // Handle secondary sidebar collapse/expand
              const secondarySidebar = this.splitElements[2]
              const secondaryThreshold = 0 + 5

              if (secondarySidebar.offsetWidth <= secondaryThreshold) {
                this.toggleSecondarySidebar(false, { preventResize: true })
              } else {
                this.toggleSecondarySidebar(true, { preventResize: true })
              }
            },
          })
        })
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
      ...mapActions({
        rootTogglePrimarySidebar: 'togglePrimarySidebar',
        rootToggleSecondarySidebar: 'secondarySidebar/toggleOpen'
      }),
      showQuickSearch() {
        this.quickSearchShown = true
      },
      databaseSelected(database) {
        this.$emit('databaseSelected', database)
      },
      togglePrimarySidebar(forceOpen?: boolean, options: { preventResize?: boolean } = {}) {
        if (typeof forceOpen === 'undefined') {
          forceOpen = !this.openPrimarySidebar
        }

        this.rootTogglePrimarySidebar(forceOpen)

        if (!options.preventResize) {
          if (forceOpen) {
            const splitSizes = [...this.split.getSizes()]
            splitSizes[0] = 35
            splitSizes[1] = 65 - splitSizes[2]
            this.split.setSizes(splitSizes)
          } else {
            this.split.collapse(0)
          }
        }
      },
      toggleSecondarySidebar(forceOpen?: boolean, options: { preventResize?: boolean } = {}) {
        if (typeof forceOpen === 'undefined') {
          forceOpen = !this.openSecondarySidebar
        }

        this.rootToggleSecondarySidebar(forceOpen)

        if (!options.preventResize) {
          if (forceOpen) {
            const splitSizes = [...this.split.getSizes()]
            splitSizes[2] = 35
            splitSizes[1] = 65 - splitSizes[0]
            this.split.setSizes(splitSizes)
          } else {
            this.split.collapse(2)
          }
        }
      },
    }
  })

</script>
