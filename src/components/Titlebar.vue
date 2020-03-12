<template>
  <div id="titlebar">
    <div class="window-icon">
      <span style="vertical-align: middle;">
          <img src="@/assets/logo.png" style="width:20px;height:20px;"/>
      </span>
    </div>
    <div class="window-title"></div>
     <div class="window-actions">
        <button class="btn btn-link" id="min-btn">-</button>
        <button class="btn btn-link" id="max-btn">+</button>
        <button class="btn btn-link" id="close-btn">x</button>
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
