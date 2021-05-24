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
import querystring from 'querystring'

export default {
  name: 'app',
  components: {
    CoreInterface, ConnectionInterface, Titlebar, AutoUpdater
  },
  data() {
    return {
      file: null,
      url: null
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

    const query = querystring.parse(global.location.search)
    if (query) {
      this.file = query.file || null
      this.url = query.url || null
    }

    this.$nextTick(() => {
      ipcRenderer.send('ready')
    })
    if (this.themeValue) {
      console.log("setting background to ", this.themeValue)
      document.body.className = `theme-${this.themeValue}`
    }


    if (this.file) {
      try {
          await this.$store.dispatch('openFile', this.file)
      } catch (ex) {
        this.$noty.error(`Error opening ${this.file}: ${ex.message}`)
      }
    }

    if (this.url) {
      try {
        await this.$store.dispatch('openUrl', this.url)
      } catch (error) {
        this.$noty.error(`Error opening ${this.url}: ${error.message}`)
      }
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
