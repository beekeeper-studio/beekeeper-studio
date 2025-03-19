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

  const SPLIT_SIZES_KEY = "interfaceSplitSizes-v2"
  const PRIMARY_SIDEBAR_OPEN_SIZE_KEY = "primarySidebarOpenSize"
  const SECONDARY_SIDEBAR_OPEN_SIZE_KEY = "secondarySidebarOpenSize"
  const PRIMARY_SIDEBAR_INITIAL_SIZE = 35
  const SECONDARY_SIDEBAR_INITIAL_SIZE = 30
  const MAIN_CONTENT_MIN_SIZE = 200

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
          const lastSavedSplitSizes = SmartLocalStorage.getItem(SPLIT_SIZES_KEY, "[35, 65, 0]")
          const splitSizes = JSON.parse(lastSavedSplitSizes)

          this.split = Split(this.splitElements, {
            snapOffset: [150, 0, 150],
            sizes: splitSizes,
            minSize: [this.primarySidebarMinWidth, MAIN_CONTENT_MIN_SIZE, 0],
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
              SmartLocalStorage.addItem(SPLIT_SIZES_KEY, splitSizes)

              // Handle primary sidebar collapse/expand
              const primarySidebar = this.splitElements[0]
              const threshold = this.primarySidebarMinWidth + 5

              if (primarySidebar.offsetWidth <= threshold) {
                SmartLocalStorage.addItem(PRIMARY_SIDEBAR_OPEN_SIZE_KEY, PRIMARY_SIDEBAR_INITIAL_SIZE)
                this.togglePrimarySidebar(false, { preventResize: true })
              } else {
                SmartLocalStorage.addItem(PRIMARY_SIDEBAR_OPEN_SIZE_KEY, splitSizes[0])
                this.togglePrimarySidebar(true, { preventResize: true })
              }

              // Handle secondary sidebar collapse/expand
              const secondarySidebar = this.splitElements[2]
              const secondaryThreshold = 0 + 5

              if (secondarySidebar.offsetWidth <= secondaryThreshold) {
                SmartLocalStorage.addItem(SECONDARY_SIDEBAR_OPEN_SIZE_KEY, SECONDARY_SIDEBAR_INITIAL_SIZE)
                this.toggleSecondarySidebar(false, { preventResize: true })
              } else {
                SmartLocalStorage.addItem(SECONDARY_SIDEBAR_OPEN_SIZE_KEY, splitSizes[2])
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
            const previousSize = Number(SmartLocalStorage.getItem(PRIMARY_SIDEBAR_OPEN_SIZE_KEY))
            const [primarySidebar, mainContent, secondarySidebar] = this.split.getSizes()
            const updatedSizes = [
              primarySidebar + previousSize,
              mainContent - previousSize,
              secondarySidebar,
            ]
            this.split.setSizes(updatedSizes)
          } else {
            const size = this.split.getSizes()[2]
            SmartLocalStorage.addItem(PRIMARY_SIDEBAR_OPEN_SIZE_KEY, size)
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
            const previousSize = Number(SmartLocalStorage.getItem(SECONDARY_SIDEBAR_OPEN_SIZE_KEY))
            const [primarySidebar, mainContent, secondarySidebar] = this.split.getSizes()
            const updatedSizes = [
              primarySidebar,
              mainContent - previousSize,
              secondarySidebar + previousSize,
            ]
            this.split.setSizes(updatedSizes)
          } else {
            const size = this.split.getSizes()[2]
            SmartLocalStorage.addItem(SECONDARY_SIDEBAR_OPEN_SIZE_KEY, size)
            this.split.collapse(2)
          }
        }
      },
    }
  })

</script>
