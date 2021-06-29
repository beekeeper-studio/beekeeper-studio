<template>
  <div class="templates">
    <section class="subheader">
      <div class="big-wrap">
        <h1>SQL Table Templates</h1>
        <div class="subtitle">Use these templates as a starting point for your next table. All templates are fully custimizable.</div>
      </div>
    </section>
    <section>
      <div class="big-wrap">
        <div class="row gutter">
          <div v-for="template in templates" :key="template.name" class="col s6">
            <router-link :to="{ name: 'Template', params: {id: template.id}}" class="card-flat card-link padding">
              <h2>{{template.name}}</h2>
              <p>{{template.description}}</p>
              <div class="badges flex wrap">
                <span class="badge" v-for="item in template.toSchema(dialect).columns" :key="item.columnName">
                  <span class="column-name">{{ item.columnName }}:</span>
                  <span class="data-type">{{ item.dataType }}</span>
                </span>
              </div>
              <span class="expand"></span>
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
import { mapState } from 'vuex'

interface Data {
  templates: Template[]
}

export default Vue.extend({
  data(): Data {
    return {
      templates
    }
  },
  computed: {
    ...mapState(['dialect']),
  }
})
</script>

<style lang="scss" scoped>
  @import '@/assets/styles/app/_variables';

  .card-flat {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: flex-start;
    padding: $gutter-w * 1.5;
    height: 100%;
    h2 {
      margin: 0;
    }
    p {
      margin: $gutter-w 0;
    }
    .badges {
      flex: 0 0 auto;
      margin: 0 -($gutter-h * 0.25);
    }
  }
</style>