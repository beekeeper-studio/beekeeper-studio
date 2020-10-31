<template>
<div class="style-wrapper">
    <div class="beekeeper-studio-wrapper">
      <titlebar v-if="$config.isMac || menuStyle === 'client'"></titlebar>
      <connection-interface v-if="!connection"></connection-interface>
      <core-interface @databaseSelected="databaseSelected" v-else :connection="connection"></core-interface>
      <auto-updater></auto-updater>
    </div>
</div>

</template>

<script>
import { ipcRenderer } from 'electron'
import { mapGetters } from 'vuex'
import Titlebar from './components/Titlebar'
import CoreInterface from './components/CoreInterface'
import ConnectionInterface from './components/ConnectionInterface'
import AutoUpdater from './components/AutoUpdater'

export default {
  name: 'app',
  components: {
    CoreInterface, ConnectionInterface, Titlebar, AutoUpdater
  },
  data() {
    return {
    }
  },
  computed: {
    connection() {
      return this.$store.state.connection
    },
    ...mapGetters({
      'themeValue': 'settings/themeValue',
      'menuStyle': 'settings/menuStyle'
    })
  },
  watch: {
    themeValue() {
      document.body.className = `theme-${this.themeValue}`
    }
  },
  async mounted() {
    this.$nextTick(() => {
      ipcRenderer.send('ready')
    })
    if (this.themeValue) {
      console.log("setting background to ", this.themeValue)
      document.body.className = `theme-${this.themeValue}`
    }
  },
  methods: {
    databaseSelected(db) {
      console.log("Do something here! (Db selected) " + db)
    },
  }
}
</script>

<style>


</style>
