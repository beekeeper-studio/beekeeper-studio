<template>
  <div class="templates">
    <h1>This is an templates page</h1>
    <div v-for="template in templates" :key="template.name">
      <h2>{{template.name}}</h2>
      <p>{{template.description}}</p>
      <router-link :to="{ name: 'Template', params: {name: template.name}}">View</router-link>
    </div>
  </div>
</template>
<script lang="ts">
import Vue from 'vue'
import templates from '@/lib/templates'
import { Template } from '@/lib/templates/base'

interface Data {
  templates: Template[]
}

export default Vue.extend({
  data(): Data {
    return {
      templates
    }
    
  }
})
</script>