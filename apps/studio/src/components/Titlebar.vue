<template>
  <div class="titlebar-wrapper">
    <div
      class="titlebar-reveal"
      v-show="fullscreen"
    />
    <div
      class="titlebar"
      ref="titlebar"
      @dblclick.prevent.stop="maximizeWindow"
      :class="{ windows: !$config.isMac, fullscreen }"
    >
      <div
        class="titlebar-icon"
        ref="titlebarIcon"
        v-if="!$config.isMac"
      >
        <img src="@/assets/logo.svg">
        <AppMenu ref="appMenu" />
      </div>
      <div class="titlebar-title noselect" ref="titlebarTitle">
        <span>{{ windowTitle }}</span>
      </div>
      <div
        class="titlebar-actions"
        ref="titlebarActions"
      >
        <div class="titlebar-actions-extra">
          <button
            class="btn btn-link"
            @dblclick.prevent.stop
            @click.prevent="togglePrimarySidebar"
            title="Toggle Primary Sidebar"
            v-if="connected"
          >
            <i
              class="material-symbols-outlined"
              :style="{
                'font-variation-settings': primarySidebarOpen ? `'FILL' 1` : `'FILL' 0`
              }"
            >dock_to_right</i>
          </button>
          <button
            class="btn btn-link"
            @dblclick.prevent.stop
            @click.prevent="toggleSecondarySidebar"
            title="Toggle Secondary Sidebar"
            v-if="connected"
          >
            <i
              class="material-symbols-outlined"
              :style="{
                'font-variation-settings': secondarySidebarOpen ? `'FILL' 1` : `'FILL' 0`
              }"
            >dock_to_left</i>
          </button>
        </div>
        <div
          v-if="!$config.isMac"
          class="window-controls-container"
        >
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
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState, mapGetters, mapActions } from 'vuex'
import { AppEvent } from "@/common/AppEvent";
import AppMenu from './menu/NewAppMenu.vue'
export default {
  components: { AppMenu },
  data() {
    return {
      maximized: false,
      fullscreen: false,
      resizeObserver: null,
    }
  },
  computed: {
    ...mapState(['windowTitle', 'connected']),
    ...mapState('sidebar', ['secondarySidebarOpen', 'primarySidebarOpen']),
  },
  mounted() {
    window.main.onMaximize(() => {
      this.maximized = true
    }, this.$util.sId);

    window.main.onUnmaximize(() => {
      this.maximized = false
    }, this.$util.sId);

    window.main.onEnterFullscreen(() => {
      this.fullscreen = true
    }, this.$util.sId);

    window.main.onLeaveFullscreen(() => {
      this.fullscreen = false
    }, this.$util.sId);

    this.resizeObserver = new ResizeObserver(() => this.calculateTitleMaxWidth())
    this.resizeObserver.observe(this.$refs.titlebar)
    this.calculateTitleMaxWidth()
  },
  beforeDestroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect()
    }
  },
  methods: {
    calculateTitleMaxWidth() {
      const halfTitlebarWidth = this.$refs.titlebar.offsetWidth / 2
      const titlebarIconWidth = this.$refs.titlebarIcon?.offsetWidth || 0
      const appMenuWidth = this.$refs.appMenu?.$el.children[0].offsetWidth || 0

      const leftWidth = titlebarIconWidth + appMenuWidth
      const rightWidth = this.$refs.titlebarActions.offsetWidth
      const sideBuffer = Math.max(leftWidth, rightWidth)

      const titleMaxWidth = Math.max((halfTitlebarWidth - sideBuffer) * 2, 0)

      this.$refs.titlebarTitle.style.maxWidth = `${titleMaxWidth}px`
    },
    togglePrimarySidebar() {
      this.trigger(AppEvent.togglePrimarySidebar)
    },
    toggleSecondarySidebar() {
      this.trigger(AppEvent.toggleSecondarySidebar)
    },
    async minimizeWindow() {
      await window.main.minimizeWindow();
    },
    async maximizeWindow() {
      const isMaximized = await window.main.isMaximized();
      if (this.fullscreen) {
        await window.main.setFullScreen(false)
      } else if (isMaximized) {
        await window.main.unmaximizeWindow()
      } else {
        await window.main.maximizeWindow();
      }
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
