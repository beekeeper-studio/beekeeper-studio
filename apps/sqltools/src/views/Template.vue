<template>
  <div>
    <h1>{{template.name}}</h1>
    
  </div>
</template>
<script lang="ts">
import templates from '@/lib/templates'
import Vue from 'vue'
export default Vue.extend({
  props: ['name'],
  data() {
    return {
      template: null
    }
  },
  mounted() {
    this.template = templates.find((t) => t.name === this.name)
  }
})
</script>