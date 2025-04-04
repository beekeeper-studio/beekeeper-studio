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
      <global-sidebar
        v-if="!minimalMode"
        @select="handleSelectGlobalSidebarItem"
        :active-item="globalSidebarActiveItem"
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
  import Statusbar from './common/StatusBar.vue'
  import ConnectionButton from './sidebar/core/ConnectionButton.vue'
  import ExportManager from './export/ExportManager.vue'
  import {AppEvent} from '../common/AppEvent'
  import QuickSearch from './quicksearch/QuickSearch.vue'
  import ProgressBar from './editor/ProgressBar.vue'
  import LostConnectionModal from './LostConnectionModal.vue'
  import Vue from 'vue'
  import RenameDatabaseElementModal from './common/modals/RenameDatabaseElementModal.vue'
  import { mapGetters, mapActions, mapState } from 'vuex'
  import _ from "lodash"

  export default Vue.extend({
    components: { CoreSidebar, CoreTabs, Sidebar, Statusbar, ConnectionButton, ExportManager, QuickSearch, ProgressBar, LostConnectionModal, RenameDatabaseElementModal, SecondarySidebar, GlobalSidebar },
    data() {
      /* eslint-disable */
      return {
        split: null,
        quickSearchShown: false,
        initializing: true,
      }
      /* eslint-enable */
    },
    computed: {
      ...mapGetters(['minimalMode']),
      ...mapState("sidebar", [
        "primarySidebarOpen",
        "primarySidebarSize",
        "secondarySidebarOpen",
        "secondarySidebarSize",
        "globalSidebarActiveItem",
      ]),
      keymap() {
        return this.$vHotkeyKeymap({
          'general.openQuickSearch': this.showQuickSearch
        })
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
      initializing() {
        if (this.initializing) return;
        this.$nextTick(() => {
          const primarySidebarSize = this.primarySidebarOpen ? this.primarySidebarSize : 0
          const secondarySidebarSize = this.secondarySidebarOpen ? this.secondarySidebarSize : 0
          const splitSizes = [
            primarySidebarSize,
            100 - (primarySidebarSize + secondarySidebarSize),
            secondarySidebarSize,
          ]

          const snapOffset = 150

          this.split = Split(this.splitElements, {
            snapOffset: [snapOffset, 0, snapOffset],
            sizes: splitSizes,
            minSize: [0, this.$bksConfig.ui.layout.mainContentMinWidth, 0],
            gutterSize: 5,
            elementStyle: (_dimension, elementSize) => ({
              width: `${elementSize}%`,
            }),
            gutter: (_index, direction) => {
                const gutter = document.createElement('div')
                gutter.className = `gutter gutter-${direction}`
                return gutter
            },
            onDragEnd: () => {
              const [primarySidebarSize, _m, secondarySidebarSize] = this.split.getSizes()

              if (this.splitElements[0].offsetWidth > snapOffset) {
                this.setPrimarySidebarSize(primarySidebarSize)
              } else {
                this.setPrimarySidebarOpen(false)
              }

              if (this.splitElements[2].offsetWidth > snapOffset) {
                this.setSecondarySidebarSize(secondarySidebarSize)
              } else {
                this.setSecondarySidebarOpen(false)
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
        setPrimarySidebarOpen: "sidebar/setPrimarySidebarOpen",
        setPrimarySidebarSize: "sidebar/setPrimarySidebarSize",
        setSecondarySidebarOpen: "sidebar/setSecondarySidebarOpen",
        setSecondarySidebarSize: "sidebar/setSecondarySidebarSize",
        setGlobalSidebarActiveItem: "sidebar/setGlobalSidebarActiveItem",
      }),
      showQuickSearch() {
        this.quickSearchShown = true
      },
      databaseSelected(database) {
        this.$emit('databaseSelected', database)
      },
      toggleOpenPrimarySidebar(force?: boolean) {
        const open = typeof force === 'undefined'
          ? !this.primarySidebarOpen
          : force

        if (open) {
          const previousSize = this.primarySidebarSize
          const [primarySidebar, mainContent, secondarySidebar] = this.split.getSizes()
          const updatedSizes = [
            primarySidebar + previousSize,
            mainContent - previousSize,
            secondarySidebar,
          ]
          this.split.setSizes(updatedSizes)
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
          const previousSize = this.secondarySidebarSize
          const [primarySidebar, mainContent, secondarySidebar] = this.split.getSizes()
          const updatedSizes = [
            primarySidebar,
            mainContent - previousSize,
            secondarySidebar + previousSize,
          ]
          this.split.setSizes(updatedSizes)
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
    }
  })

</script>
