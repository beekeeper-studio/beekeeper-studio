<template>
<div class="style-wrapper">
    <div class="beekeeper-studio-wrapper">
      <titlebar v-if="$config.isMac || menuStyle === 'client'"></titlebar>
      <template v-if="storeInitialized">
        <connection-interface v-if="!connection"></connection-interface>
        <core-interface @databaseSelected="databaseSelected" v-else :connection="connection"></core-interface>
        <auto-updater></auto-updater>
        <state-manager />
        <notification-manager />
      </template>
    </div>
    <portal-target name="menus" multiple />
    <portal-target name="modals" multiple />
    <data-manager />
</div>

</template>

<script>
import { ipcRenderer } from 'electron'
import { mapGetters, mapState } from 'vuex'
import Titlebar from './components/Titlebar'
import CoreInterface from './components/CoreInterface'
import ConnectionInterface from './components/ConnectionInterface'
import AutoUpdater from './components/AutoUpdater'
import StateManager from './components/quicksearch/StateManager.vue'
import DataManager from './components/data/DataManager.vue'
import querystring from 'query-string'
import NotificationManager from './components/NotificationManager.vue'

export default {
  name: 'app',
  components: {
    CoreInterface, ConnectionInterface, Titlebar, AutoUpdater, NotificationManager,
    StateManager, DataManager
  },
  data() {
    return {
      url: null
    }
  },
  computed: {
    connection() {

      return this.$store.state.connection
    },
    ...mapState(['storeInitialized']),
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
    await this.$store.dispatch('fetchUsername')

    const query = querystring.parse(global.location.search)
    if (query) {
      this.url = query.url || null
    }


    this.$nextTick(() => {
      ipcRenderer.send('ready')
    })
    if (this.themeValue) {
      document.body.className = `theme-${this.themeValue}`
    }

    if (this.url) {
      try {
        await this.$store.dispatch('openUrl', this.url)
      } catch (error) {
        console.error(error)
        this.$noty.error(`Error opening ${this.url}: ${error}`)
        throw error
      }
    }

  },
  methods: {
    databaseSelected(db) {
      // TODO: do something here if needed
    },
  }
}
</script>

<style>


</style>
