<template>
  <div id="windows-titlebar" class="titlebar">
    <div class="window-icon">
      <img v-if="!isMac" src="@/assets/logo.svg" />
    </div>
    <div class="window-title">Beekeeper Studio</div>
    <div class="window-actions">
      <template v-if="isMac">
        <div class="window-icon">
          <img src="@/assets/logo.svg" />
        </div>
      </template>
      <template v-if="isWindows">
        <button class="btn btn-link" id="minimize" @click.prevent="minimizeWindow"><i class="material-icons">minimize</i></button>
        <button class="btn btn-link" id="maximize" @click.prevent="maximizeWindow"><i class="material-icons">crop_3_2</i></button>
        <button class="btn btn-link" id="quit" @click.prevent="closeWindow"><i class="material-icons">clear</i></button>
      </template>
    </div>
  </div>
</template>

<script>
import {remote} from 'electron'
export default {
    data() {
      return {
        window: remote.BrowserWindow.getFocusedWindow()
      }
    },
    methods: {
      minimizeWindow() {
        this.window.minimize();
      },
      maximizeWindow() {
        if (this.window.isMaximized()) {
          this.window.unmaximize();
        } else {
          this.window.maximize();
        }
      },
      closeWindow() {
        window.close()
      }
    }
  }
</script>

<style>
  #windows-title {
    user-select: none;
  }
</style>
