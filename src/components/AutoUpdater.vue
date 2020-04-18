<template>
  <div></div>
</template>

<script type="text/javascript">

import { ipcRenderer } from 'electron'
import Noty from 'noty'

export default {
  data() {
    return {
      n: new Noty({
        text: 'A new version is availble. Install and restart?',
        layout: 'bottomRight',
        timeout: false,
        closeWith: 'button',
        buttons: [
          Noty.button('Later', 'btn btn-flat', () => {
              this.n.close();
          }),
          Noty.button('Restart', 'btn btn-primary', this.triggerUpdate)
        ]
      }),
    }
  },
  mounted() {
    ipcRenderer.on('update-available', this.notifyUpdate)
    ipcRenderer.send('updater-ready')
  },
  methods: {
    triggerUpdate() {
      ipcRenderer.send('trigger-update')
      console.log('update triggered, bloop bloop')
    },
    notifyUpdate() {
      this.n.show();
    }
  }
}
  
</script>
