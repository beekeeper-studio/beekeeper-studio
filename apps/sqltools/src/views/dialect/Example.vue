<template>
  <div class="dialect-example-page" v-if="example">
    <div class="subheader">
      <div class="small-wrap">
        <router-link  class="back-link" :to="{name: 'Dialect', params: {dialect_id: dialect}}">
          <i class="material-icons">arrow_backward</i> 
          <span>Back to {{dialectTitle}} code examples</span>
        </router-link>
        <h1>{{example.title}}</h1>
        <div class="description">{{example.description}}</div>
      </div>
    </div>
    <section class="code-examples">
      <div class="small-wrap">
        <div class="code" v-for="(item, idx) in codes" :key="idx">
          <highlighted-code :format="true" :code="item.value || item" :dialect="dialect">
            <div class="code-title" v-if="item.title">{{item.title}}</div>
          </highlighted-code>
        </div>
      </div>
    </section>
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

<style lang="scss" scoped>
  @import '@/assets/styles/app/_variables';

  .back-link {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    color: $theme-primary;
    margin-bottom: $gutter-w;
    i {
      width: 24px;
    }
  }
</style>