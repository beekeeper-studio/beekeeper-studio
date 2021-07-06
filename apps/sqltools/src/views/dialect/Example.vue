<template>
  <div class="dialect-example-page small-wrap" v-if="example">
    <div class="back-link">
      <router-link :to="{name: 'Dialect', params: {dialect_id: dialect}}">Back to {{dialectTitle}} code examples</router-link>
    </div>
    <h1>{{example.title}}</h1>
    <div class="description">{{example.description}}</div>
    <div class="code-examples">
      <div class="code" v-for="(item, idx) in codes" :key="idx">
        <highlighted-code :format="true" :code="item.value || item" :dialect="dialect">
          <div class="code-title" v-if="item.title">{{item.title}}</div>
        </highlighted-code>
      </div>
    </div>

  </div>
</template>
<script lang="ts">
import HighlightedCode from '@/components/HighlightedCode.vue'
import { Example } from '@/data/examples'
import { Dialect, DialectTitles } from '@shared/lib/dialects/models'
import _ from 'lodash'
import Vue from 'vue'
import { mapState } from 'vuex'
interface State {
  dialect?: Dialect,
  exampleId?: string,
  example: Example
}
export default Vue.extend({
  metaInfo() {
    return {
      title: this.example?.title,
      meta: [
        {
          name: 'description',
          content: this.example?.description
        }
      ]
    }
  },
  components: { HighlightedCode },
  beforeRouteEnter(to, _from, next) {
    next((component: any) => {
      component.dialect = to.params.dialect_id
      component.example = component.examples?.[component.dialect]?.find((e) => e.id === to.params.id)
      if (!component.example) return '/'
    })
  },
  data(): State {
    return {
      dialect: undefined,
      example: undefined
    }
  },
  computed: {
    ...mapState(['examples']),
    dialectTitle() {
      return DialectTitles[this.dialect]
    },
    codes() {
      if (_.isString(this.example.code)) return [this.example.code]
      return this.example.code
    }
  }
})
</script>