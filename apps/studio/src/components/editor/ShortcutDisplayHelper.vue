<template>
  <div class="shortcut-wrapper">
    <div
      class="shortcut"
      v-for="sc in getShortcut"
      :key="sc"
    >
      <span v-for="kb in sc" :key="kb">{{ kb }}</span>
    </div>
  </div>
</template>
<script lang="ts">
  import type { KeybindingPath } from "@/common/bksConfig/BksConfigProvider"

  export default {
    props: {
      shortcutPath: {
        required: true,
        type: String as () => KeybindingPath
      }
    },
    computed : {
      getShortcut() {
        const results = this.$bksConfig.getKeybindings('ui', this.shortcutPath)
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
