<template>
  <div />
</template>

<script lang="ts">
import { ipcRenderer } from 'electron'
import Noty from 'noty'
import Vue from 'vue'

import {AppEvent} from '../common/AppEvent'

export default Vue.extend({
  data() {
    /* eslint-disable */
    return {
      manualNotification: new Noty({
        text: "A new version is available. Download from our website now.",
        layout: 'bottomRight',
        timeout: false,
        // @ts-ignore
        closeWith: 'button',
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
        // @ts-ignore
        closeWith: 'button',
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
        // @ts-ignore
        closeWith: 'button',
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
    ipcRenderer.on('update-available', this.notifyUpdate)
    ipcRenderer.on('manual-update', this.notifyManual)
    ipcRenderer.on('update-downloaded', this.notifyDownloaded)
    ipcRenderer.send('updater-ready')
  },
  methods: {
    closeAll() {
      Noty.closeAll('download')
    },
    triggerDownload() {
      ipcRenderer.send('download-update')
      this.downloadNotification.close()
      this.$noty.info("Hold tight! Downloading update...")
    },
    notifyManual() {
      this.closeAll()
      this.manualNotification.show()
    },
    linkToDownload() {
      ipcRenderer.send(AppEvent.openExternally, ["https://beekeeperstudio.io/get"])
    },
    triggerInstall() {
      ipcRenderer.send('install-update')
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
