<template>
  <footer :class="classes">
    <slot></slot>
  </footer>
</template>

<script>
import { mapGetters } from 'vuex'
export default {
  computed: {
    ...mapGetters(['connectionColor']),
    classes() {
        const result = {
          'statusbar': true
        }
        result[this.connectionColor] = true
        return result
    }
  }

}
</script>