<template>
  <div v-if="template">
    <h1>{{template.name}}</h1>

  </div>
</template>
<script lang="ts">
import templates from '@/lib/templates'
import Vue from 'vue'
export default Vue.extend({
  beforeRouteEnter(to, _from, next) {
    next((component: any) => {
      return component.setTemplate(to.params.id)
    })
  },
  beforeRouteUpdate(to, _from, next) {
    next(this.setTemplate(to.params.id))
  },
  data() {
    return {
      template: null
    }
  },
  methods: {
    setTemplate(id: string) {
      const t = templates.find((t) => t.id === id)
      if (t) {
        this.template = t
        return true
      }
      return false
    }
  },
  mounted() {
  }
})
</script>