<template>
  <div id="interface" class="interface" v-hotkey="keymap">
    <div class="interface-wrap row">
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
  export default {
    components: { CoreSidebar, CoreTabs, Sidebar, Statusbar, ConnectionButton, ExportManager },
    props: [ 'connection' ],
    data() {
      return {
        split: null,
        sidebarShown: true,
        keymap: {
        }
      }
    },
    computed: {
      splitElements() {
        return [
          this.$refs.sidebar.$refs.sidebar,
          this.$refs.content
        ]
      }
    },
    mounted() {
      this.$root.$on(AppEvent.toggleSidebar, this.toggleSidebar)
      this.$store.dispatch('updateHistory')
      this.$store.dispatch('updateFavorites')

      this.$nextTick(() => {
        this.split = Split(this.splitElements, {
          elementStyle: (dimension, size) => ({
              'flex-basis': `calc(${size}%)`,
          }),
          sizes: [25,75],
          minSize: 280,
          expandToMin: true,
          gutterSize: 8,
        })
      })

    },
    beforeDestroy() {
      this.$root.$off(AppEvent.toggleSidebar, this.toggleSidebar)
      if(this.split) {
        console.log("destroying split")
        this.split.destroy()
      }
    },
    methods: {
      databaseSelected(database) {
        this.$emit('databaseSelected', database)
      },
      toggleSidebar() {
        this.sidebarShown = !this.sidebarShown
      },
    }
  }

</script>
