<template>
  <div>
    <div
      v-for="(warning, index) in activeWarnings"
      :key="index"
      class="alert alert-warning"
    >
      <i class="material-icons">error_outline</i>
      <div>
        {{ warning.message }}
        <a
          v-if="warning.link"
          :href="warning.link"
        >
          {{ warning.linkText || 'Read more' }}
        </a>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import { platformWarnings } from '@/common/platformWarnings'

export default Vue.extend({
  props: {
    location: {
      type: String,
      required: true,
    },
  },
  computed: {
    activeWarnings() {
      const warnings = platformWarnings[this.location] || []
      return warnings.filter((w) => {
        if (!this.$config[w.configKey]) return false
        if (w.unless && this.$config[w.unless]) return false
        return true
      })
    },
  },
})
</script>
