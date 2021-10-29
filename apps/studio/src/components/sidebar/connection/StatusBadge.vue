<template>
  <span :title="error ? error.message : ''" class="badge" :class="classes">
    <i class="material-icons">{{status}}</i>
  </span>
</template>
<script lang="ts">
import Vue from 'vue'
export default Vue.extend({
  props: {
    display: {
      type: Boolean,
      default: true
    },
    errors: {
      type: Array,
      default: () => []
    }
  },
  computed: {
    error() {
      return this.errors
        .filter((e) => !!e)[0]
    },
    status() {
      if (this.error) return 'priority_high'
      if (this.display) return 'check'
      return null
    },
    classes() {
      if (this.error) return 'badge-danger'
      if (this.display) return 'badge-info'
      return null
    }
  }
})
</script>