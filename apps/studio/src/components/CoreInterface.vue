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
      ref="splitContainer"
    >
      <global-sidebar
        v-if="!minimalMode"
        @select="handleSelectGlobalSidebarItem"
        :active-item="globalSidebarActiveItem"
        ref="globalSidebar"
      />

      <sidebar
        ref="sidebar"
        class="primary-sidebar"
      >
        <core-sidebar
          @databaseSelected="databaseSelected"
        />
      </sidebar>

      <div
        ref="content"
        class="page-content flex-col main-content"
        id="page-content"
      >
        <core-tabs />
      </div>

      <secondary-sidebar ref="secondarySidebar" @close="handleToggleOpenSecondarySidebar(false)" />
    </div>
    <global-status-bar
      :connection-button-width="globalPrimarySidebarWidth"
      :connection-button-icon-width="globalSidebarWidth"
    />
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
  import GlobalSidebar from './sidebar/GlobalSidebar.vue'
  import CoreTabs from './CoreTabs.vue'
  import Split from 'split.js'
  import ExportManager from './export/ExportManager.vue'
  import {AppEvent} from '../common/AppEvent'
  import QuickSearch from './quicksearch/QuickSearch.vue'
  import ProgressBar from './editor/ProgressBar.vue'
  import LostConnectionModal from './LostConnectionModal.vue'
  import GlobalStatusBar from './GlobalStatusBar.vue'
  import Vue from 'vue'
  import RenameDatabaseElementModal from './common/modals/RenameDatabaseElementModal.vue'
  import { mapGetters, mapActions, mapState } from 'vuex'
  import _ from "lodash"

  export default Vue.extend({
    components: { CoreSidebar, CoreTabs, Sidebar, ExportManager, QuickSearch, ProgressBar, LostConnectionModal, RenameDatabaseElementModal, SecondarySidebar, GlobalStatusBar, GlobalSidebar },
    data() {
      /* eslint-disable */
      return {
        split: null,
        quickSearchShown: false,
        initializing: true,
        resizeObserver: null,
        /** Sum of global sidebar width and primary sidebar width */
        globalPrimarySidebarWidth: 0,
        globalSidebarWidth: 0,
      }
      /* eslint-enable */
    },
    computed: {
      ...mapState(['usedConfig']),
      ...mapGetters(['minimalMode']),
      ...mapState("sidebar", [
        "primarySidebarOpen",
        "primarySidebarWidth",
        "secondarySidebarOpen",
        "secondarySidebarWidth",
        "globalSidebarActiveItem",
      ]),
      keymap() {
        const result = this.$vHotkeyKeymap({
          'general.openQuickSearch': this.showQuickSearch
        });
        return result;
      },
      splitElements() {
        return [
          this.$refs.sidebar.$el,
          this.$refs.content,
          this.$refs.secondarySidebar.$el
        ]
      },
      rootBindings() {
        return [
          { event: AppEvent.quickSearch, handler: this.showQuickSearch},
          { event: AppEvent.togglePrimarySidebar, handler: this.handleToggleOpenPrimarySidebar },
          { event: AppEvent.toggleSecondarySidebar, handler: this.handleToggleOpenSecondarySidebar },
        ]
      },
    },
    watch: {
      async usedConfig(){
        await this.$store.dispatch('pins/loadPins');
      },
      initializing() {
        if (this.initializing) return;
        this.$nextTick(() => {
          this.readjustWidths({
            containerWidth: this.getSplitContainerWidth(),
          })
          const primarySidebarSize = this.primarySidebarOpen ? (this.primarySidebarWidth / this.getSplitContainerWidth()) * 100 : 0
          const secondarySidebarSize = this.secondarySidebarOpen ? (this.secondarySidebarWidth / this.getSplitContainerWidth()) * 100 : 0
          const mainContentSize = 100 - (primarySidebarSize + secondarySidebarSize)

          const splitSizes = [
            primarySidebarSize,
            mainContentSize,
            secondarySidebarSize,
          ]

          this.split = Split(this.splitElements, {
            snapOffset: [this.$bksConfig.ui.layout.primarySidebarMinWidth, 0, this.$bksConfig.ui.layout.secondarySidebarMinWidth],
            sizes: splitSizes,
            minSize: [0, this.$bksConfig.ui.layout.mainContentMinWidth, 0],
            gutterSize: 5,
            elementStyle: (_dimension, elementSize, _gutterSize, index) => {
              // Check if the element is the main content
              if (index === 1) {
                return {};
              }
              const containerSize = this.$refs.splitContainer.offsetWidth;
              const width = (elementSize / 100) * containerSize;
              return {
                width: `${width}px`,
              };
            },
            gutter: (_index, direction) => {
                const gutter = document.createElement('div')
                gutter.className = `gutter gutter-${direction}`
                return gutter
            },
            onDragEnd: ([primarySidebarSize, _mainContentSize, secondarySidebarSize]) => {
              // Define a very small threshold to detect if sidebar has effectively zero width
              // Use a tiny value like 1% to account for any rounding errors
              const COLLAPSE_THRESHOLD = 1

              // Check if sidebars are effectively collapsed
              const primaryOpen = primarySidebarSize > COLLAPSE_THRESHOLD
              const secondaryOpen = secondarySidebarSize > COLLAPSE_THRESHOLD

              this.setPrimarySidebarOpen(primaryOpen)
              this.setSecondarySidebarOpen(secondaryOpen)

              if (primaryOpen) {
                const primarySidebarWidth = (primarySidebarSize / 100) * this.getSplitContainerWidth()
                this.setPrimarySidebarWidth(primarySidebarWidth)
              }

              if (secondaryOpen) {
                const secondarySidebarWidth = (secondarySidebarSize / 100) * this.getSplitContainerWidth()
                this.setSecondarySidebarWidth(secondarySidebarWidth)
              }
            },
          })
        })
      },
    },
    mounted() {
      this.$store.dispatch('hideEntities/load')
      this.registerHandlers(this.rootBindings)
      this.$nextTick(() => {
        this.initializing = false
        // This is the easiest way to track the width of the primary sidebar
        // in real time because sidebar can be resized by dragging or clicking
        // the toggle button. An alternative to this would be assigning the
        // width on drag and click events.
        this.resizeObserver = new ResizeObserver((entries) => {
          const primarySidebar = entries[0]
          this.globalPrimarySidebarWidth = this.globalSidebarWidth + primarySidebar.contentRect.width
        })
        this.$nextTick(() => {
          this.globalSidebarWidth = this.$refs.globalSidebar.$el.offsetWidth
          this.resizeObserver.observe(this.splitElements[0])
        })
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
      if (this.resizeObserver) {
        this.resizeObserver.disconnect()
      }
    },
    methods: {
      ...mapActions({
        setPrimarySidebarOpen: "sidebar/setPrimarySidebarOpen",
        setPrimarySidebarWidth: "sidebar/setPrimarySidebarWidth",
        setSecondarySidebarOpen: "sidebar/setSecondarySidebarOpen",
        setSecondarySidebarWidth: "sidebar/setSecondarySidebarWidth",
        setGlobalSidebarActiveItem: "sidebar/setGlobalSidebarActiveItem",
        readjustWidths: "sidebar/readjustWidths",
      }),
      showQuickSearch() {
        this.quickSearchShown = true
      },
      databaseSelected(database) {
        this.$emit('databaseSelected', database)
      },
      // Normalizes the sizes array to ensure they sum to exactly 100
      normalizeSizes(sizes: [number, number, number]) {
        const sum = sizes.reduce((acc, size) => acc + size, 0)
        if (Math.abs(sum - 100) < 0.001) return sizes // Already very close to 100
        if (sum === 0) return [0, 100, 0] // Fallback to default distribution
        return sizes.map((size) => (size / sum) * 100)
      },

      // Expands a pane to the specified width while respecting minimum widths
      expandSplitPane(paneIndex: number, targetWidth: number) {
        // size = in percent, width = in pixels
        const containerSize = this.getSplitContainerWidth()
        const targetSize = (targetWidth / containerSize) * 100
        const mainContentMinSize = (this.$bksConfig.ui.layout.mainContentMinWidth / containerSize) * 100
        const primarySidebarMinSize = (this.$bksConfig.ui.layout.primarySidebarMinWidth / containerSize) * 100
        const secondarySidebarMinSize = (this.$bksConfig.ui.layout.secondarySidebarMinWidth / containerSize) * 100

        // Get current sizes
        const currentSizes = this.split.getSizes()
        const updatedSizes = [...currentSizes]

        // Calculate available space and needed space
        const mainIndex = 1 // Main content is always at index 1
        const otherPaneIndex = paneIndex === 0 ? 2 : 0 // Other sidebar index

        // Calculate size changes
        const sizeChange = targetSize - currentSizes[paneIndex]
        updatedSizes[paneIndex] = targetSize

        // Try to take space from main content first
        if (currentSizes[mainIndex] - sizeChange >= mainContentMinSize) {
          // Main content has enough space
          updatedSizes[mainIndex] = currentSizes[mainIndex] - sizeChange
        } else {
          // Main content needs to maintain minimum size
          updatedSizes[mainIndex] = mainContentMinSize

          // Need to take remaining space from other pane
          const remainingChange = sizeChange - (currentSizes[mainIndex] - mainContentMinSize)
          const otherPaneMinSize = otherPaneIndex === 0 ? primarySidebarMinSize : secondarySidebarMinSize

          if (currentSizes[otherPaneIndex] - remainingChange >= otherPaneMinSize) {
            // Other pane has enough space
            updatedSizes[otherPaneIndex] = currentSizes[otherPaneIndex] - remainingChange
          } else {
            // Other pane needs to maintain minimum size
            updatedSizes[otherPaneIndex] = otherPaneMinSize

            // If we get here, we need to reduce the target pane's size
            const totalAvailable = 100 - mainContentMinSize - otherPaneMinSize
            updatedSizes[paneIndex] = totalAvailable
          }
        }

        // Normalize sizes to ensure they sum to 100
        const normalizedSizes = this.normalizeSizes(updatedSizes as [number, number, number])
        this.split.setSizes(normalizedSizes)

        if (this.primarySidebarOpen) {
          const primarySidebarWidth = (normalizedSizes[0] / 100) * containerSize
          this.setPrimarySidebarWidth(primarySidebarWidth)
        }
        if (this.secondarySidebarOpen) {
          const secondarySidebarWidth = (normalizedSizes[2] / 100) * containerSize
          this.setSecondarySidebarWidth(secondarySidebarWidth)
        }
      },
      toggleOpenPrimarySidebar(force?: boolean) {
        const open = typeof force === 'undefined'
          ? !this.primarySidebarOpen
          : force

        if (open) {
          this.expandSplitPane(0, this.primarySidebarWidth)
        } else {
          this.split.collapse(0)
        }

        this.setPrimarySidebarOpen(open)
      },
      handleToggleOpenPrimarySidebar() {
        this.toggleOpenPrimarySidebar()
      },
      handleToggleOpenSecondarySidebar(force?: boolean) {
        const open = typeof force === 'undefined'
          ? !this.secondarySidebarOpen
          : force

        if (open) {
          this.expandSplitPane(2, this.secondarySidebarWidth)
        } else {
          this.split.collapse(2)
        }

        this.setSecondarySidebarOpen(open)
      },
      handleSelectGlobalSidebarItem(item) {
        if (this.globalSidebarActiveItem === item) {
          this.toggleOpenPrimarySidebar()
        } else if(!this.primarySidebarOpen) {
          this.toggleOpenPrimarySidebar(true)
        }
        this.setGlobalSidebarActiveItem(item);
      },

      getSplitContainerWidth() {
        return this.$refs.splitContainer.offsetWidth
      },
    }
  })

</script>
