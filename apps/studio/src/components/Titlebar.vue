<template>
  <div class="titlebar-wrapper">
    <div
      class="titlebar-reveal"
      v-show="fullscreen"
    />
    <div
      class="titlebar"
      @dblclick.prevent.stop="maximizeWindow"
      :class="{ windows: !$config.isMac, fullscreen }"
    >
      <div
        class="titlebar-icon"
        v-if="!$config.isMac"
      >
        <img src="@/assets/logo.svg">
        <AppMenu />
      </div>
      <div class="titlebar-title noselect">
        {{ windowTitle }}
      </div>
      <div
        class="titlebar-actions"
        v-if="!$config.isMac"
      >
        <template>
          <button
            class="btn btn-link"
            id="minimize"
            @click.prevent="minimizeWindow"
          >
            <i class="material-icons">remove</i>
          </button>
          <button
            class="btn btn-link"
            id="maximize"
            @click.prevent="maximizeWindow"
          >
            <i
              class="material-icons"
              v-if="fullscreen"
            >close_fullscreen</i>
            <i
              class="material-icons maximized"
              v-else-if="maximized"
            >filter_none</i>
            <i
              class="material-icons"
              v-else
            >crop_square</i>
          </button>
          <button
            class="btn btn-link"
            id="quit"
            @click.prevent="closeWindow"
          >
            <i class="material-icons">clear</i>
          </button>
        </template>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import AppMenu from './menu/NewAppMenu.vue'
export default {
  components: { AppMenu },
  data() {
    return {
      maximized: false,
      fullscreen: false
    }
  },
  computed: {
    ...mapState(['windowTitle'])
  },
  mounted() {
    // FIXME This doesn't work after the refactor and needs fixing
    //this.getWindow()?.on('maximize', () => {
    //  this.maximized = true
    //})
    //this.getWindow()?.on('unmaximize', () => {
    //  this.maximized = false
    //})
    //this.getWindow()?.on('enter-full-screen', () => {
    //  this.fullscreen = true
    //})
    //this.getWindow()?.on('leave-full-screen', () => {
    //  this.fullscreen = false
    //})
  },
  methods: {
    async updateFlags() {
      this.maximized = await window.main.isMaximized();
      this.fullscreen = await window.main.isFullscreen();
    },
    async minimizeWindow() {
      await window.main.minimizeWindow();
      await this.updateFlags();
    },
    async maximizeWindow() {
      if (this.fullscreen) {
        await window.main.setFullScreen(false)
      } else if (this.maximized) {
        await window.main.unmaximizeWindow()
      } else {
        await window.main.maximizeWindow();
      }
      await this.updateFlags();
    },
    async closeWindow() {
      await window.main.closeWindow();
    }
  }
}
</script>

<style>
  #windows-title {
    user-select: none;
  }
</style>
