<template>
  <div id="windows-titlebar" class="titlebar">
    <div class="window-icon">
      <img src="@/assets/logo.svg" />
    </div>
    <div class="window-title">Beekeeper Studio</div>
    <div class="window-actions">
      <button class="btn btn-link" id="minimize"><i class="material-icons">minimize</i></button>
      <button class="btn btn-link" id="maximize"><i class="material-icons">crop_3_2</i></button>
      <button class="btn btn-link" id="quit"><i class="material-icons">clear</i></button>
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
        const minimize = document.getElementById("minimize");
        const maximize = document.getElementById("maximize");
        const quit = document.getElementById("quit");
        const window = remote.BrowserWindow.getFocusedWindow();

        minimize.addEventListener("click", minimizeWindow);
        maximize.addEventListener("click", maximizeWindow);
        quit.addEventListener("click", closeWindow);

        function minimizeWindow() {
          window.minimize();
        }
        function maximizeWindow() {
          if (window.isMaximized()) {
            window.unmaximize();
          } else {
            window.maximize();
          }
        }
        function closeWindow() {
          remote.getCurrentWindow().close()
        }
      }
    }
  }
</script>
