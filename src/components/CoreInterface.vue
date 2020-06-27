<template>
  <div id="interface" class="interface">
    <div class="interface-wrap row">
      <sidebar ref="sidebar">
        <core-sidebar @databaseSelected="databaseSelected" :connection="connection"></core-sidebar>
        <footer class="statusbar">
          <a class="database-connection btn btn-icon" @click.prevent="disconnect" v-tooltip="'Disconnect'">
            <i class="material-icons">link</i>
            <span class="truncate">Connected</span>
          </a>
        </footer>
      </sidebar>
      <div ref="content" class="page-content flex-col" id="page-content">
        <core-tabs :connection="connection"></core-tabs>
      </div>
    </div>
  </div>
</template>

<script>
  import Sidebar from './Sidebar'
  import CoreSidebar from './CoreSidebar'
  import CoreTabs from './CoreTabs'
  import Split from 'split.js'

  // import { mapState } from 'vuex'

  export default {
    components: { CoreSidebar, CoreTabs, Sidebar },
    props: [ 'connection' ],
    data() {
      return {
        split: null
      }
    },
    computed: {
      // ...mapState(['usedConfig']),
      splitElements() {
        return [
          this.$refs.sidebar.$refs.sidebar,
          this.$refs.content
        ]
      }
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
      },
      async disconnect() {
        await this.$store.dispatch('disconnect')
        this.$noty.success("Successfully Disconnected")
      }
    }
  }

</script>