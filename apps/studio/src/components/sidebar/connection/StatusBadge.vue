<template>
  <span :title="error ? error.message : ''" class="badge" :class="classes" v-if="this.error">
    <i class="material-icons">{{status}}</i>
  </span>
</template>
<script lang="ts">
import Vue from 'vue'
export default Vue.extend({
  props: ['credentials'],
  computed: {
    error() {
      return this.credentials.map((c) => c.error).find((c) => c)
    },
    status() {
      if (this.error) return 'error_outline'
      if (this.credentials?.length) return 'check'
      return null
    },
    classes() {
      if (this.error) return 'badge-danger'
      if (this.credentials?.length) return 'badge-info'
      return null
    }
  }
})
</script>