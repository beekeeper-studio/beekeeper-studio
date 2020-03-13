<template>
  <div id="windows-titlebar" class="titlebar">
    <div class="window-icon">
      <img src="@/assets/logo.svg" />
    </div>
    <div class="window-title">Beekeeper Studio</div>
    <div class="window-actions">
      <button class="btn btn-link" id="min-btn"><i class="material-icons">minimize</i></button>
      <button class="btn btn-link" id="max-btn"><i class="material-icons">crop_3_2</i></button>
      <button class="btn btn-link" id="close-btn"><i class="material-icons">clear</i></button>
    </div>
  </div>
</template>

<script>
import {remote} from 'electron'
export default {
    mounted() {
      this.init()
    },
    methods: {
      init() {
        const window = remote.BrowserWindow.getFocusedWindow()
        document.getElementById("min-btn").addEventListener("click", () => {
          window.minimize();
        });
        document.getElementById("max-btn").addEventListener("click", () => {
          if(window.isMaximized()){
            window.unmaximize();
          } else {
            window.maximize();
          }
        });
        document.getElementById("close-btn").addEventListener("click", () => {
          window.close();
        });
      }
    },
  }
</script>
