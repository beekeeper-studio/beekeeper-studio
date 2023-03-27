<template>
  <div class="titlebar" @dblclick.prevent.stop="maximizeWindow" :class="{windows: !$config.isMac}">
    <div class="titlebar-icon" v-if="!$config.isMac">
      <img src="@/assets/logo.svg" />
      <AppMenu></AppMenu>
    </div>
    <div class="titlebar-title noselect">{{windowTitle}}</div>
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
import { mapState } from 'vuex'
import AppMenu from './menu/NewAppMenu'
import platformInfo from '@/common/platform_info'
export default {
  components: { AppMenu },
  data() {
    return {
      maximized: this.$native.getCurrentWindow()?.isMaximized(),
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
      if (this.isMaximized()) {
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
