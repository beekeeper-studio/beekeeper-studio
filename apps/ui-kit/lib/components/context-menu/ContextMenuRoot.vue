<template>
  <!-- Original file souce copyright John Datserakis https://github.com/johndatserakis/vue-simple-context-menu -->
  <teleport :to="targetElement ?? 'body'">
    <div class="BksUiKit" ref="container">
      <context-menu :options="options" :event="event" :item="item" @close="$emit('close')" />
    </div>
  </teleport>
</template>

<script lang="ts">
import ContextMenu from "./ContextMenu.vue";
import Teleport from "vue2-teleport"
import Vue from 'vue'

export default Vue.extend({
  name: 'ContextMenuRoot',
  components: {
    Teleport,
    ContextMenu,
  },
  props: ['options', 'event', 'item', 'targetElement'],
  data() {
    return {
      menuWidth: null,
      menuHeight: null,
      menuOpen: false,
    }
  },
  methods: {
    hideContextMenu() {
      this.$emit('close')
    },
    onEscKeyRelease(event) {
      if (event.keyCode === 27) {
        this.hideContextMenu();
      }
    },
    maybeHideMenu(event) {
      const clickOutside = !this.$refs.container.contains(event.target)
      if (clickOutside) {
        this.hideContextMenu()
      }
    }
  },
  mounted() {
    document.addEventListener('keyup', this.onEscKeyRelease);
    document.addEventListener('mousedown', this.maybeHideMenu)
  },
  beforeDestroy() {
    document.removeEventListener('mousedown', this.maybeHideMenu)
    document.removeEventListener('keyup', this.onEscKeyRelease);
  }
})
</script>
