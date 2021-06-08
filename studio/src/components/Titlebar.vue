<template>
  <div class="titlebar" @dblclick.prevent.stop="maximizeWindow" :class="{windows: !$config.isMac}">
    <div class="titlebar-icon" v-if="!$config.isMac">
      <img src="@/assets/logo.svg" />
      <AppMenu></AppMenu>
    </div>
    <div class="titlebar-title noselect">Beekeeper Studio</div>
    <div class="titlebar-actions" v-if="!$config.isMac">
      <template>
        <button class="btn btn-link" id="minimize" @click.prevent="minimizeWindow"><i class="material-icons">remove</i></button>
        <button class="btn btn-link" id="maximize" @click.prevent="maximizeWindow">
          <i class="material-icons maximized" v-if="maximized">filter_none</i>
          <i class="material-icons" v-else>crop_square</i>
        </button>
        <button class="btn btn-link" id="quit" @click.prevent="closeWindow"><i class="material-icons">clear</i></button>
      </template>
    </div>
  </div>
</template>

<script>
import {remote} from 'electron'
import AppMenu from './menu/NewAppMenu'
export default {
  components: { AppMenu },
  data() {
    return {
      window: remote.getCurrentWindow(),
      maximized: remote.getCurrentWindow().isMaximized()
    }
  },
  mounted() {
    this.window.on('maximize', () => {
      this.maximized = true
    })

    this.window.on('unmaximize', () => {
      this.maximized = false
    })
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
