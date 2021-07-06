<template>
  <div class="dialect-page small-wrap">
    <h1>Code examples for {{dialectName}}</h1>
    <div class="description">
      Remembering all the syntax for {{dialectName}} is hard, at least we find it hard to remember it all. Hopefully the examples below help you as much as they help us.
    </div>
    <div class="examples-list">
      <ul>
        <li class="example-item" v-for="example in dialectExamples" :key="example.id">
          <router-link :to="{name: 'Example', params: {dialect_id: dialect, id: example.id} }">{{example.linkText}}</router-link>
          <span class="example-item-description">{{example.description}}</span>
        </li>
      </ul>
    </div>
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