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
        <img src="assets/logo.svg">
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
import platformInfo from '@/common/platform_info'
export default {
  components: { AppMenu },
  data() {
    return {
      maximized: this.$native.getCurrentWindow()?.isMaximized(),
      fullscreen: this.$native.getCurrentWindow()?.isFullScreen(),
    }
  },
  computed: {
    ...mapState(['windowTitle']),
  },
  mounted() {
    this.getWindow()?.on('maximize', () => {
      this.maximized = true
    })
    this.getWindow()?.on('unmaximize', () => {
      this.maximized = false
    })
    this.getWindow()?.on('enter-full-screen', () => {
      this.fullscreen = true
    })
    this.getWindow()?.on('leave-full-screen', () => {
      this.fullscreen = false
    })
  },
  methods: {
    getWindow() {
      return this.$native.getCurrentWindow()
    },
    isMaximized() {
      return this.getWindow()?.isMaximized()
    },
    minimizeWindow() {
      this.getWindow()?.minimize();
    },
    maximizeWindow() {
      if (this.fullscreen) {
        this.getWindow()?.setFullScreen(false);
      } else if (this.isMaximized()) {
        this.getWindow()?.unmaximize();
      } else {
        this.getWindow()?.maximize();
      }
    },
    closeWindow() {
      this.getWindow()?.close()
    }
  }
}
</script>

<style>
  #windows-title {
    user-select: none;
  }
</style>
