<template>
  <!-- Original file souce copyright John Datserakis https://github.com/johndatserakis/vue-simple-context-menu -->
  <teleport :to="getContainer()">
    <context-menu
      ref="container"
      :options="options"
      :event="event"
      :item="item"
      @close="hideContextMenu"
    />
  </teleport>
</template>

<script lang="ts">
import ContextMenu from "./ContextMenu.vue";
import Teleport from "vue2-teleport"
import Vue from 'vue'
import { getContextMenuContainer } from "../../config/context-menu";
import props from "./props";

export default Vue.extend({
  name: 'ContextMenuRoot',
  components: {
    Teleport,
    ContextMenu,
  },
  props,
  data() {
    return {
      menuWidth: null,
      menuHeight: null,
      menuOpen: false,
    }
  },
  methods: {
    hideContextMenu() {
      this.$destroy()
    },
    onEscKeyRelease(event) {
      if (event.keyCode === 27) {
        this.hideContextMenu();
      }
    },
    maybeHideMenu(event) {
      const clickOutside = !this.$refs.container.$el.contains(event.target)
      if (clickOutside) {
        this.hideContextMenu()
      }
    },
    getContainer() {
      return this.targetElement || getContextMenuContainer()
    },
  },
  mounted() {
    document.addEventListener('keyup', this.onEscKeyRelease);
    document.addEventListener('mousedown', this.maybeHideMenu)
  },
  beforeDestroy() {
    document.removeEventListener('mousedown', this.maybeHideMenu)
    document.removeEventListener('keyup', this.onEscKeyRelease);
  },
  destroyed() {
    this.$emit("bks-destroyed");
  },
})
</script>
