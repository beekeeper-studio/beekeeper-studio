<template>
  <div class="shortcut-wrapper">
    <div
      class="shortcut"
      v-for="sc in this.getShortcut(this.shortcutPath)"
      :key="sc"
    >
      <span v-for="kb in sc" :key="kb">{{ kb }}</span>
    </div>
  </div>
</template>
<script type="text/javascript">
  export default {
    props: ['shortcutPath'],
    methods : {
      getShortcut(shortcut) {
        const results = this.$bksConfig.getKeybindings('ui', shortcut)
        const keybindings = []

        if (typeof results[0] === 'string') {
          keybindings.push(results)
        }
        else if (Array.isArray(results[0])) {
          results.forEach(r => keybindings.push(r)) 
        }

        return keybindings
      }
    }
  }
</script>

<style lang="scss" scoped>
.shortcut-wrapper {
  .shortcut + .shortcut {
      padding-top: .5rem;
  }
}
</style>
