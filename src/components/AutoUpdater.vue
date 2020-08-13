<template>
  <div></div>
</template>

<script type="text/javascript">
import { ipcRenderer } from 'electron'
import Noty from 'noty'

export default {
  data() {
    return {
      downloadNotification: new Noty({
        text: 'A new version is availble. Download now?',
        layout: 'bottomRight',
        timeout: false,
        closeWith: 'button',
        buttons: [
          Noty.button('Not now', 'btn btn-flat', () => {
              this.downloadNotification.close();
          }),
          Noty.button('Download', 'btn btn-primary', this.triggerDownload)
        ]
      }),
      installNotification: new Noty({
        text: "Update downloaded. Restart Beekeeper Studio to install",
        layout: 'bottomRight',
        timeout: false,
        closeWith: 'button',
        buttons: [
          Noty.button('Later', 'btn btn-flat', () => {
            this.installNotification.close()
          }),
          Noty.button('Restart Now', 'btn btn-primary', this.triggerInstall)
        ]
      })

    }
  },
  mounted() {
    ipcRenderer.on('update-available', this.notifyUpdate)
    ipcRenderer.on('update-downloaded', this.notifyDownloaded)
    ipcRenderer.send('updater-ready')
  },
  methods: {
    triggerDownload() {
      ipcRenderer.send('download-update')
      this.downloadNotification.close()
      this.$noty.info("Hold tight! Downloading update...")
    },
    triggerInstall() {
      ipcRenderer.send('install-update')
    },
    notifyUpdate() {
      this.downloadNotification.show();
    },
    notifyDownloaded() {
      this.installNotification.show();
    }
  }
}

</script>
