<template>
  <div />
</template>

<script lang="ts">
import Noty from 'noty'
import Vue from 'vue'

const MANAGED_UPDATE_TEXT = "A new version of Beekeeper Studio is available. Contact your system administrator to install it."

type NoticeButton = [label: string, classes: string, onClick: (notice: Noty) => void]

export default Vue.extend({
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
    // Built on each call: a closed Noty can't be shown again, so a reused one
    // never came back after being dismissed, not even from Help > Check for
    // Software Updates.
    showNotice(text: string, buttons: NoticeButton[]) {
      this.closeAll()
      const notice = new Noty({
        text,
        layout: 'bottomRight',
        timeout: false,
        closeWith: ['button'],
        buttons: buttons.map(([label, classes, onClick]) =>
          Noty.button(label, classes, () => onClick(notice))
        ),
        queue: 'download'
      })
      notice.show()
    },
    notifyUpdate() {
      this.showNotice('A new version is available. Download now?', [
        ['Not now', 'btn btn-flat', (notice) => notice.close()],
        ['Download', 'btn btn-primary', this.triggerDownload],
      ])
    },
    notifyManual() {
      this.showNotice("A new version is available. Download from our website now.", [
        ['Not now', 'btn btn-flat', (notice) => notice.close()],
        ['Download', 'btn btn-primary', this.linkToDownload],
      ])
    },
    // MSI installs: IT deploys updates, so there is nothing to download
    notifyManaged(_event, version?: string) {
      // Noty renders text as HTML, so only a plain version string goes in
      const text = /^[0-9A-Za-z.+-]+$/.test(version || '')
        ? `Beekeeper Studio ${version} is available. Contact your system administrator to install it.`
        : MANAGED_UPDATE_TEXT
      this.showNotice(text, [
        ['OK', 'btn btn-primary', (notice) => notice.close()],
      ])
    },
    notifyDownloaded() {
      this.showNotice("Update downloaded. Restart Beekeeper Studio to install", [
        ['Later', 'btn btn-flat', (notice) => notice.close()],
        ['Restart Now', 'btn btn-primary', this.triggerInstall],
      ])
    },
    triggerDownload(notice: Noty) {
      window.main.triggerDownload();
      notice.close()
      this.$noty.info("Hold tight! Downloading update...")
    },
    linkToDownload() {
      window.main.openExternally("https://beekeeperstudio.io/get");
    },
    triggerInstall() {
      window.main.triggerInstall();
    }
  }
})

</script>
