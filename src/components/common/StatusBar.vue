<template>
  <footer :class="classes">
    <slot></slot>
  </footer>
</template>

<script>
import { mapGetters } from 'vuex'
export default {
  props: ['mode'],
  computed: {
    ...mapGetters(['connectionColor']),
    classes() {
        const result = {
          'statusbar': true
        }
        if (this.mode) {
          result[this.mode] = true
          result[this.connectionColor] = true
        } else {
          result[this.connectionColor] = true
        }
        return result
    }
  }

}
</script>
