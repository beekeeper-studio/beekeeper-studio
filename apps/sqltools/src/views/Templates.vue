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
            <router-link :to="{ name: 'Template', params: {id: template.id}}" class="card-flat">
              <h2>{{template.name}}</h2>
              <p>{{template.description}}</p>
              <div class="badges flex wrap">
                <span class="badge" v-for="item in template.toSchema(dialect)" :key="item.columnName">
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
    height: 100%;
    transition: box-shadow 0.2s ease-in-out;
    &:hover {
      box-shadow: inset 0 0 0 2px $theme-primary;
    }
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
    .badge {
      font-family: 'Source Code Pro', monospace;
      margin: ($gutter-h * 0.25);
      line-height: 1.8;
      padding: 0 ($gutter-w * 0.75);
      font-size: 85%;
      background: rgba($theme-secondary, 0.2);
      .data-type {
        color: $text-light;
        margin-left: $gutter-h * 0.75;
      }
    }
    .view-btn {
      font-size: 0.95rem;
      min-width: 0;
      margin: ($gutter-w * 0.75) -0.6rem -0.6rem 0;
    }
    .card-footer {
      display: flex;
      justify-content: flex-end;
      width: 100%;
    }
  }
</style>