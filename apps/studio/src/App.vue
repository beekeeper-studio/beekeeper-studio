<template>
  <div class="style-wrapper">
    <div
      class="beekeeper-studio-wrapper"
      :class="{ 'beekeeper-studio-minimal-mode': $store.getters.minimalMode }"
    >
      <titlebar v-if="$config.isMac || menuStyle === 'client' || (runningWayland)" />
      <template v-if="storeInitialized">
        <!-- TODO (@day): need to come up with a better way to check this. Just set a 'connected' flag? -->
        <connection-interface v-if="!connected" />
        <core-interface
          @databaseSelected="databaseSelected"
          v-else
        />
        <auto-updater />
        <state-manager />
        <notification-manager />
        <upgrade-required-modal />
      </template>
    </div>
    <portal-target
      name="menus"
      multiple
    />
    <portal-target
      name="modals"
      multiple
    />
    <dropzone />
    <data-manager />
    <confirmation-modal-manager />
    <util-died-modal />
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import { ipcRenderer } from 'electron'
import { mapGetters, mapState } from 'vuex'
import Titlebar from './components/Titlebar.vue'
import CoreInterface from './components/CoreInterface.vue'
import ConnectionInterface from './components/ConnectionInterface.vue'
import AutoUpdater from './components/AutoUpdater.vue'
import StateManager from './components/quicksearch/StateManager.vue'
import DataManager from './components/data/DataManager.vue'
import querystring from 'query-string'
import NotificationManager from './components/NotificationManager.vue'
import UpgradeRequiredModal from './components/common/UpgradeRequiredModal.vue'
import ConfirmationModalManager from '@/components/common/modals/ConfirmationModalManager.vue'
import Dropzone from '@/components/Dropzone.vue'
import UtilDiedModal from '@/components/UtilDiedModal.vue'

import rawLog from 'electron-log'

const log = rawLog.scope('app.vue')

export default Vue.extend({
  name: 'App',
  components: {
    CoreInterface, ConnectionInterface, Titlebar, AutoUpdater, NotificationManager,
    StateManager, DataManager, UpgradeRequiredModal, ConfirmationModalManager, Dropzone, UtilDiedModal
  },
  data() {
    return {
      url: null,
      runningWayland: false
    }
  },
  computed: {
    ...mapState(['storeInitialized', 'database', 'connected']),
    ...mapGetters({
      'themeValue': 'settings/themeValue',
      'menuStyle': 'settings/menuStyle'
    })
  },
  watch: {
    database() {
      log.info('database changed', this.database)
    },
    themeValue() {
      document.body.className = `theme-${this.themeValue}`
    }
  },
  async mounted() {
    await ipcRenderer.invoke('requestPorts')
    await this.$store.dispatch('fetchUsername')

    const query = querystring.parse(global.location.search, { parseBooleans: true })
    if (query) {
      this.url = query.url || null
      this.runningWayland = !!query.runningWayland
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
    databaseSelected(_db) {
      // TODO: do something here if needed
    },
  }
})
</script>

<style>


</style>
