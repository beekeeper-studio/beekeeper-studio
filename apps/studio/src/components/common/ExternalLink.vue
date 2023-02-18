<template>
  <a @click.prevent.stop="click"><slot></slot></a>
</template>
<script>
export default {

  props: ['href'],
  methods: {
    click() {
      this.$native.openLink(this.href)
    }
  }
}
</script>
