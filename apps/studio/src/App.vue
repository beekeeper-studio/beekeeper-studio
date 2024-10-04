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
    <enter-license-modal />
    <workspace-sign-in-modal />
    <import-queries-modal />
    <import-connections-modal />
    <confirmation-modal-manager />
    <util-died-modal />
    <template v-if="$store.state.licenses.initialized">
      <trial-begin-modal />
      <trial-expired-modal />
      <license-expired-modal />
    </template>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import { mapGetters, mapState } from 'vuex'
import Titlebar from './components/Titlebar.vue'
import CoreInterface from './components/CoreInterface.vue'
import ConnectionInterface from './components/ConnectionInterface.vue'
import AutoUpdater from './components/AutoUpdater.vue'
import StateManager from './components/quicksearch/StateManager.vue'
import DataManager from './components/data/DataManager.vue'
import querystring from 'query-string'

import UpgradeRequiredModal from './components/common/UpgradeRequiredModal.vue'
import WorkspaceSignInModal from '@/components/data/WorkspaceSignInModal.vue'
import ImportQueriesModal from '@/components/data/ImportQueriesModal.vue'
import ImportConnectionsModal from '@/components/data/ImportConnectionsModal.vue'
import TimeAgo from 'javascript-time-ago'
import EnterLicenseModal from './components/ultimate/EnterLicenseModal.vue'
import { AppEvent } from './common/AppEvent'
import globals from './common/globals'
import NotificationManager from './components/NotificationManager.vue'
import Noty from 'noty';
import ConfirmationModalManager from '@/components/common/modals/ConfirmationModalManager.vue'
import Dropzone from '@/components/Dropzone.vue'
import UtilDiedModal from '@/components/UtilDiedModal.vue'
import TrialBeginModal from '@/components/license/TrialBeginModal.vue'
import TrialExpiredModal from '@/components/license/TrialExpiredModal.vue'
import LicenseExpiredModal from '@/components/license/LicenseExpiredModal.vue'

import rawLog from 'electron-log'

const log = rawLog.scope('app.vue')

export default Vue.extend({
  name: 'App',
  components: {
    CoreInterface, ConnectionInterface, Titlebar, AutoUpdater, NotificationManager,
    StateManager, DataManager, UpgradeRequiredModal, ConfirmationModalManager, Dropzone,
    UtilDiedModal, WorkspaceSignInModal, ImportQueriesModal, ImportConnectionsModal,
    EnterLicenseModal, TrialBeginModal, TrialExpiredModal, LicenseExpiredModal,
  },
  data() {
    return {
      url: null,
      interval: null,
      licenseInterval: null,
      runningWayland: false,
    }
  },
  computed: {
    activeLicense() {
      return this.$config.isDevelopment ||
        (this.license && this.license.active)
    },
    ...mapState(['storeInitialized', 'connected', 'database']),
    ...mapState('licenses', ['status']),
    ...mapGetters({
      'isTrial': 'isTrial',
      'isUltimate': 'isUltimate',
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
    },
    status(curr, prev) {
      this.$store.dispatch('updateWindowTitle')

      if (prev.isUltimate && curr.isCommunity && curr.condition === "License expired") {
        this.$root.$emit(AppEvent.licenseExpired, curr.license)
      }
    },
  },
  async beforeDestroy() {
    clearInterval(this.interval)
    clearInterval(this.licenseInterval)
    await this.$store.commit('userEnums/setWatcher', null)
  },
  async mounted() {
    this.notifyFreeTrial()
    this.interval = setInterval(this.notifyFreeTrial, globals.trialNotificationInterval)
    const query = querystring.parse(window.location.search, { parseBooleans: true })
    if (query) {
      this.url = query.url || null
      this.runningWayland = !!query.runningWayland
    }


    this.$nextTick(() => {
      window.main.isReady();
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
    notifyFreeTrial() {
      Noty.closeAll('trial')
      if (this.isTrial && this.isUltimate) {
        const ta = new TimeAgo('en-US')
        const validUntil = this.status.license.validUntil
        const options = {
          text: `Your free trial expires ${ta.format(validUntil)} (${validUntil.toLocaleDateString()})`,
          type: 'warning',
          closeWith: ['button'],
          layout: 'bottomRight',
          timeout: false,
          queue: 'trial',
          buttons: [
            Noty.button('Buy a License', 'btn btn-flat', () => {
              window.location.href = "https://beekeeperstudio.io/pricing"
            }),
            Noty.button('Enter License', 'btn btn-primary', () => {
              this.$root.$emit(AppEvent.enterLicense)
            })
          ]
        }
        // @ts-ignore
        const n = new Noty(options)
        n.show()
      }
    },
    databaseSelected(_db) {
      // TODO: do something here if needed
    },
  }
})
</script>

<style>


</style>
