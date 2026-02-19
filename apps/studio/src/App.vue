<template>
  <div class="style-wrapper">
    <div
      class="beekeeper-studio-wrapper"
      :class="{ 'beekeeper-studio-minimal-mode': $store.getters.minimalMode }"
      :style="{ '--bks-text-editor-font-size': `${editorFontSize}px` }"
    >
      <titlebar />
      <template v-if="storeInitialized">
        <!-- TODO (@day): need to come up with a better way to check this. Just set a 'connected' flag? -->
        <connection-interface v-if="!connected" />
        <core-interface
          @databaseSelected="databaseSelected"
          v-else
        />
        <auto-updater />
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
    <configuration-warning-modal />
    <enter-license-modal />
    <workspace-sign-in-modal />
    <workspace-create-modal />
    <workspace-rename-modal />
    <import-queries-modal />
    <import-connections-modal />
    <plugin-controller />
    <plugin-manager-modal />
    <keyboard-shortcuts-modal />
    <confirmation-modal-manager />
    <lock-manager />
    <util-died-modal />
    <template v-if="licensesInitialized">
      <trial-expired-modal />
      <license-expired-modal />
      <lifetime-license-expired-modal />
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
import DataManager from './components/data/DataManager.vue'
import querystring from 'query-string'
import ConfigurationWarningModal from '@/components/ConfigurationWarningModal.vue'

import WorkspaceCreateModal from '@/components/data/WorkspaceCreateModal.vue'
import WorkspaceRenameModal from '@/components/data/WorkspaceRenameModal.vue'
import UpgradeRequiredModal from './components/upsell/UpgradeRequiredModal.vue'
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
import TrialExpiredModal from '@/components/license/TrialExpiredModal.vue'
import LicenseExpiredModal from '@/components/license/LicenseExpiredModal.vue'
import LifetimeLicenseExpiredModal from '@/components/license/LifetimeLicenseExpiredModal.vue'
import type { LicenseStatus } from "@/lib/license";
import { SmartLocalStorage } from '@/common/LocalStorage';
import PluginManagerModal from '@/components/plugins/PluginManagerModal.vue'
import KeyboardShortcutsModal from '@/components/common/modals/KeyboardShortcutsModal.vue'
import PluginController from '@/components/plugins/PluginController.vue'
import LockManager from "@/components/managers/LockManager.vue";

import rawLog from '@bksLogger'
import { assignContextMenuToAllInputs } from './mixins/assignContextMenuToAllInputs'

const log = rawLog.scope('app.vue')

export default Vue.extend({
  name: 'App',
  mixins: [assignContextMenuToAllInputs],
  components: {
    CoreInterface, ConnectionInterface, Titlebar, AutoUpdater, NotificationManager,
    DataManager, UpgradeRequiredModal, ConfirmationModalManager, Dropzone,
    UtilDiedModal, WorkspaceSignInModal, ImportQueriesModal, ImportConnectionsModal,
    EnterLicenseModal, TrialExpiredModal, LicenseExpiredModal,
    LifetimeLicenseExpiredModal, WorkspaceCreateModal, WorkspaceRenameModal,
    PluginManagerModal, ConfigurationWarningModal, PluginController, LockManager, KeyboardShortcutsModal,
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
    ...mapState('licenses', {
      status: (state) => state.status,
      licensesInitialized: (state) => state.initialized,
    }),
    ...mapGetters({
      'isTrial': 'isTrial',
      'isUltimate': 'isUltimate',
      'themeValue': 'settings/themeValue',
    }),
    editorFontSize() {
      return this.$store.state.settings?.settings?.editorFontSize?.value || 14
    }
  },
  watch: {
    database() {
      log.info('database changed', this.database)
    },
    themeValue() {
      document.body.className = `theme-${this.themeValue}`
      this.trigger(AppEvent.changedTheme, this.themeValue)
    },
    status(curr, prev) {
      this.$store.dispatch('updateWindowTitle')
      this.validateLicenseExpiry(curr, prev)
    },
    async licensesInitialized(initialized) {
      if (initialized) {
        await this.$nextTick()
        this.validateLicenseExpiry()
      }
    },
  },
  async beforeDestroy() {
    clearInterval(this.interval)
    clearInterval(this.licenseInterval)
  },
  async mounted() {
    this.notifyFreeTrial()
    this.interval = setInterval(this.notifyFreeTrial, globals.trialNotificationInterval)
    this.$store.dispatch('licenses/updateAll');
    this.licenseInterval = setInterval(
      () => this.$store.dispatch('licenses/updateAll'),
      globals.licenseCheckInterval
    )
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
        const { auth, cancelled  } = await this.$bks.unlock();
        if (cancelled) return;
        await this.$store.dispatch('openUrl', { url: this.url, auth })
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
    validateLicenseExpiry(curr?: LicenseStatus, prev?: LicenseStatus) {
      if (SmartLocalStorage.getBool('expiredLicenseEventsEmitted', false)) return

      const compare = prev && curr
      const isValidDateExpired = compare ? !prev.isValidDateExpired && curr.isValidDateExpired : this.status.isValidDateExpired
      const isSupportDateExpired = compare ? !prev.isSupportDateExpired && curr.isSupportDateExpired : this.status.isSupportDateExpired
      const status = compare ? curr : this.status
      if (curr?.fromFile && curr?.noLicenseKey) {
        this.$noty.error(`Something is wrong with your license file: ${curr?.condition.join(", ") }`)
      }

      if (isValidDateExpired) {
        this.$root.$emit(AppEvent.licenseValidDateExpired, status)
      }

      if (isSupportDateExpired) {
        this.$root.$emit(AppEvent.licenseSupportDateExpired, status)
      }

      if (isValidDateExpired || isSupportDateExpired) {
        this.$root.$emit(AppEvent.licenseExpired, status)
        SmartLocalStorage.setBool('expiredLicenseEventsEmitted', true)
      }
    }
  }
})
</script>

<style>


</style>
