<template>
  <div class="beekeeper-studio-wrapper">
    <titlebar v-if="isWindows || isMac"></titlebar>
    <connection-interface v-if="!connection"></connection-interface>
    <core-interface @databaseSelected="databaseSelected" v-else :connection="connection"></core-interface>
  </div>
</template>

<script>

import { ipcRenderer } from 'electron'
import Noty from 'noty'
import Titlebar from './components/Titlebar'
import CoreInterface from './components/CoreInterface'
import ConnectionInterface from './components/ConnectionInterface'
// import DbTest from './components/DbTest'

export default {
  name: 'app',
  components: {
    CoreInterface, ConnectionInterface, Titlebar
  },
  data() {
    return {
      n: new Noty({
        text: 'An update is available. Install now? (requires app restart)',
        layout: 'bottomRight',
        timeout: false,
        closeWith: 'button',
        buttons: [
          Noty.button('YES', 'btn btn-success', this.triggerUpdate, {id: 'button1', 'data-status': 'ok'}),
          Noty.button('NO', 'btn btn-error', () => {
              this.n.close();
          })
        ]
      }),
    }
  },
  computed: {
    connection() {
      return this.$store.state.connection
    }
  },
  mounted() {
    ipcRenderer.on('update-available', this.notifyUpdate)
    ipcRenderer.on('update-downloading', this.notifyDownloading)
  },
  methods: {
    databaseSelected(db) {
      console.log("Do something here! (Db selected) " + db)
    },
    triggerUpdate() {
      ipcRenderer.send('trigger-update')
      console.log('update triggered, bloop bloop')
    },
    notifyUpdate() {
      this.n.show();
    },
    notifyDownloading() {
      this.n.close()
      this.$noty.info("Downloading update... Beekeeper will restart when ready to install")
    }

  }
}
</script>

<style>
</style>
