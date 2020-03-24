<template>
  <div class="titlebar" :class="{windows: isWindows}">
    <div class="titlebar-icon" v-if="!isMac">
      <img src="@/assets/logo.svg" />
    </div>
    <div class="titlebar-title">Beekeeper Studio</div>
    <div class="titlebar-actions" v-if="isWindows">
      <template>
        <button class="btn btn-link" id="minimize" @click.prevent="minimizeWindow"><i class="material-icons">remove</i></button>
        <button class="btn btn-link" id="maximize" @click.prevent="maximizeWindow"><i class="material-icons">crop_square</i></button>
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
