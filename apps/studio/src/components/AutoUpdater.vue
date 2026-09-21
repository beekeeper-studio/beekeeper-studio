<template>
  <div />
</template>

<script lang="ts">
import Noty from 'noty'
import Vue from 'vue'
import { mapGetters, mapState } from 'vuex'
import { UpdateStage } from '@/store/modules/UpdateModule'

export default Vue.extend({
  data() {
    /* eslint-disable */
    return {
      manualNotification: new Noty({
        text: "A new version is available. Download from our website now.",
        layout: 'bottomRight',
        timeout: false,
        closeWith: ['button'],
        buttons: [
          Noty.button('Not now', 'btn btn-flat', () => {
            // @ts-ignore
            this.dismiss();
          }),
          // @ts-ignore
          Noty.button('Download', 'btn btn-primary', this.linkToDownload)
        ],
        queue: 'download'
      }),
      downloadNotification: new Noty({
        text: 'A new version is available. Download now?',
        layout: 'bottomRight',
        timeout: false,
        closeWith: ['button'],
        buttons: [
          Noty.button('Not now', 'btn btn-flat', () => {
              // @ts-ignore
              this.dismiss();
          }),
          // @ts-ignore
          Noty.button('Download', 'btn btn-primary', this.triggerDownload)
        ],
        queue: 'download'
      }),
      installNotification: new Noty({
        text: "Update downloaded. Restart Beekeeper Studio to install",
        layout: 'bottomRight',
        timeout: false,
        closeWith: ['button'],
        buttons: [
          Noty.button('Later', 'btn btn-flat', () => {
            // @ts-ignore
            this.dismiss()
          }),
          // @ts-ignore
          Noty.button('Restart Now', 'btn btn-primary', this.triggerInstall)
        ],
        queue: 'download'
      })
      /* eslint-enable */
    }
  },
  computed: {
    ...mapState(['connected']),
    ...mapState('updates', ['stage']),
    ...mapGetters('updates', { updatePending: 'pending' }),
    /**
     * The stage worth raising a toast for, or null for none. The connection
     * screen carries its own update card, so toasts are held back until the
     * user is past it and there's nowhere else for the news to go.
     */
    notifiableStage(): UpdateStage | null {
      if (!this.connected || !this.updatePending) return null
      return this.stage
    },
  },
  watch: {
    notifiableStage: {
      immediate: true,
      handler() {
        this.syncNotification()
      },
    },
  },
  mounted() {
    window.main.onUpdateEvent('update-available', (_e, version?: string) => this.found('available', version))
    window.main.onUpdateEvent('manual-update', (_e, version?: string) => this.found('manual', version))
    window.main.onUpdateEvent('update-downloaded', (_e, version?: string) => this.found('downloaded', version))
    window.main.updaterReady();
  },
  methods: {
    found(stage: UpdateStage, version?: string) {
      this.$store.dispatch('updates/found', { stage, version })
    },
    syncNotification() {
      this.closeAll()
      if (!this.notifiableStage) return
      const notifications: Partial<Record<UpdateStage, Noty>> = {
        available: this.downloadNotification,
        manual: this.manualNotification,
        downloaded: this.installNotification,
      }
      notifications[this.notifiableStage]?.show()
    },
    closeAll() {
      Noty.closeAll('download')
    },
    dismiss() {
      this.$store.dispatch('updates/dismiss')
    },
    triggerDownload() {
      this.$store.dispatch('updates/download')
      // The connection screen's update card shows the download starting; from
      // a toast there's nothing else to see, so say it out loud.
      this.$noty.info("Hold tight! Downloading update...")
    },
    linkToDownload() {
      window.main.openExternally("https://beekeeperstudio.io/get");
    },
    triggerInstall() {
      this.$store.dispatch('updates/install')
    },
  }
})

</script>
