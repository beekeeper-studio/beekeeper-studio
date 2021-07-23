<template>
  <a @click.prevent.stop="click"><slot></slot></a>
</template>
<script>
import { remote } from 'electron'
export default {

  props: ['href'],
  methods: {
    click() {
      remote.shell.openExternal(this.href)
    }
  }
}
</script>
