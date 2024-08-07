<template>
  <a @click.prevent.stop="click"><slot /></a>
</template>
<script lang="ts">
import Vue from 'vue'

export default Vue.extend({

  props: {
    href: String
  },
  methods: {
    click() {
      this.$native.openLink(this.href)
    }
  }
})
</script>
