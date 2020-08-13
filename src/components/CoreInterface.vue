<template>
  <div id="interface" class="interface">
    <div class="interface-wrap row">
      <sidebar ref="sidebar">
        <core-sidebar @databaseSelected="databaseSelected" :connection="connection"></core-sidebar>
        <statusbar>
          <ConnectionButton></ConnectionButton>
        </statusbar>
      </sidebar>
      <div ref="content" class="page-content flex-col" id="page-content">
        <core-tabs :connection="connection"></core-tabs>
      </div>
    </div>
  </div>
</template>

<script>
  import Sidebar from './common/Sidebar'
  import CoreSidebar from './sidebar/CoreSidebar'
  import CoreTabs from './CoreTabs'
  import Split from 'split.js'
  import Statusbar from './common/StatusBar'
  import ConnectionButton from './sidebar/core/ConnectionButton'
  export default {
    components: { CoreSidebar, CoreTabs, Sidebar, Statusbar, ConnectionButton },
    props: [ 'connection' ],
    data() {
      return {
        split: null
      }
    },
    computed: {
      splitElements() {
        return [
          this.$refs.sidebar.$refs.sidebar,
          this.$refs.content
        ]
      },

    },
    mounted() {
      this.$store.dispatch('updateHistory')
      this.$store.dispatch('updateFavorites')

      this.$nextTick(() => {
        this.split = Split(this.splitElements, {
          elementStyle: (dimension, size) => ({
              'flex-basis': `calc(${size}%)`,
          }),
          sizes: [10,90],
          minSize: 200,
          expandToMin: true,
          gutterSize: 8,
        })
      })

    },
    beforeDestroy() {
      if(this.split) {
        console.log("destroying split")
        this.split.destroy()
      }
    },
    methods: {
      databaseSelected(database) {
        this.$emit('databaseSelected', database)
      }
    }
  }

</script>
