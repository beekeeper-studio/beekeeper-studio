<template>
  <div class="templates">
    <section class="subheader">
      <div class="big-wrap">
        <h1>This is an templates page</h1>
      </div>
    </section>
    <section>
      <div class="big-wrap">
        <div class="row gutter">
            <div v-for="template in templates" :key="template.name" class="col s6">
              <router-link :to="{ name: 'Template', params: {name: template.name}}" class="card-flat">
                <h2>{{template.name}}</h2>
                <p>{{template.description}}</p>
                <span class="text-primary">View</span>
              </router-link>
            </div>
        </div>
      </div>
    </section>
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

<style lang="scss" scoped>
  @import '@/assets/styles/app/_variables';
  
  section {
    padding: $gutter-w * 2;
  }
  .subheader {
    background: $query-editor-bg;
  }
  .card-flat {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: flex-start;
    padding: $gutter-w * 1.5;
    flex-grow: 1;
    h2 {
      margin: 0;
    }
  }
</style>