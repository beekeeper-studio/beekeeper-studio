<template>
  <div class="dialect-page">
    <div class="subheader">
      <div class="small-wrap">
        <h1 class="title">Code examples for {{dialectName}}</h1>
        <div class="subtitle description">
          Remembering all the syntax for {{dialectName}} is hard, at least we find it hard to remember it all. Hopefully the examples below help you as much as they help us.
        </div>
      </div>
    </div>
    <section class="page-content examples-list">
      <div class="small-wrap">
        <router-link :to="{name: 'Example', params: {dialect_id: dialect, id: example.id} }" class="card-flat card-link example-item" v-for="example in dialectExamples" :key="example.id">
          <div><span class="badge" >{{example.linkText}}</span></div>
          <span class="example-item-description">{{example.description}}</span>
        </router-link>
      </div>
    </section>
  </div>
</template>
<script lang="ts">
import { SqliteExamples } from '@/data/examples'
import { Dialect, DialectTitles } from '@shared/lib/dialects/models'
import Vue from 'vue'
import { mapState } from 'vuex'
interface State {
  dialect: Dialect
}
export default Vue.extend({
  metaInfo() {
    return {
      title: `${this.dialectName} Syntax Examples`,
      meta: [
        {
          name: "description",
          content: `Simple code examples for ${this.dialectName}, ALTER TABLE, ALTER COLUMN, etc.`
        }
      ]
    }
  },
  beforeRouteEnter(to, _from, next) {
    next((component: any) => {
      component.dialect = to.params.dialect_id
    })
  },
  data(): State {
    return {
      dialect: 'sqlite'
    }
  },
  computed: {
    ...mapState(['examples']),
    dialectName() {
      return DialectTitles[this.dialect] || 'Sqlite'
    },
    dialectExamples() {
      return this.examples[this.dialect] || SqliteExamples
      // return []
    }
  }
})
</script>

<style lang="scss" scoped>
  @import '@/assets/styles/app/_variables';

  .card-flat {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    padding: $gutter-w;
    margin-bottom: $gutter-h;
    .badge {
      display: inline-flex;
      margin: 0 0 $gutter-h;
    }
    .example-item-description {
      padding-left: $gutter-h * 0.5;
    }
  }
</style>
