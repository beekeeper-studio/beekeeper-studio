<template>
  <div />
</template>

<script lang="ts">
import Noty from 'noty'
import Vue from 'vue'

const MANAGED_UPDATE_TEXT = "A new version of Beekeeper Studio is available. Contact your system administrator to install it."

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
            this.manualNotification.close();
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
              this.downloadNotification.close();
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
            this.installNotification.close()
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
  },
  mounted() {
    window.main.onUpdateEvent('update-available', this.notifyUpdate)
    window.main.onUpdateEvent('manual-update', this.notifyManual)
    window.main.onUpdateEvent('managed-update', this.notifyManaged)
    window.main.onUpdateEvent('update-downloaded', this.notifyDownloaded)
    window.main.updaterReady();
  },
  methods: {
    closeAll() {
      Noty.closeAll('download')
    },
    triggerDownload() {
      window.main.triggerDownload();
      this.downloadNotification.close()
      this.$noty.info("Hold tight! Downloading update...")
    },
    notifyManual() {
      this.closeAll()
      this.manualNotification.show()
    },
    // MSI installs: IT deploys updates, so there is nothing to download.
    // Built on each call because a closed Noty can't be shown again, and users
    // can dismiss this and check again from the Help menu.
    notifyManaged(_event, version?: string) {
      this.closeAll()
      // Noty renders text as HTML, so only a plain version string goes in
      const text = /^[0-9A-Za-z.+-]+$/.test(version || '')
        ? `Beekeeper Studio ${version} is available. Contact your system administrator to install it.`
        : MANAGED_UPDATE_TEXT
      const notification = new Noty({
        text,
        layout: 'bottomRight',
        timeout: false,
        closeWith: ['button'],
        buttons: [
          Noty.button('OK', 'btn btn-primary', () => notification.close())
        ],
        queue: 'download'
      })
      notification.show()
    },
    linkToDownload() {
      window.main.openExternally("https://beekeeperstudio.io/get");
    },
    triggerInstall() {
      window.main.triggerInstall();
    },
    notifyUpdate() {
      this.closeAll()
      this.downloadNotification.show()
    },
    notifyDownloaded() {
      this.closeAll()
      this.installNotification.show();
    }
  }
})

</script>
