<template>
  <div class="template" v-if="template">
    <section class="subheader">
      <div class="small-wrap">
        <router-link to="/templates"><i class="material-icons">arrow_backward</i> All Templates</router-link>
      </div>
    </section>
    <section>
      <div class="small-wrap">
        
        <!-- Table Hader -->
        <div class="table-header flex flex-top">
          <div class="flex-col expand">
            <h1 class="table-name">{{template.name}} <span class="badge">template</span></h1>
            <div class="table-description">{{template.description}}</div>
            <router-link class="text-primary" :to="{name: 'Build', params: {id: template.id}}">Open in Table Builder</router-link>
          </div>
          <div class="actions">
            <dialect-picker />
          </div>
        </div>

        <!-- Schema Builder -->
        <schema-builder
          v-if="template"
          :initialColumns="template.toSchema(dialect).columns"
          :resetOnUpdate="true"
          :disabled="true"
        >
        </schema-builder>

        <highlighted-code :code="sql" :dialect="dialect">
          <h3>Generated SQL</h3>
        </highlighted-code>
      </div>
    </section>
  </div>
</template>
<script lang="ts">
import { mapState } from 'vuex'
import templates from '@/lib/templates'
import Vue from 'vue'
import SchemaBuilder from '@shared/components/SchemaBuilder.vue'
import DialectPicker from '@/components/DialectPicker.vue'
import Formatter from 'sql-formatter'
import { SqlGenerator } from '@shared/lib/sql/SqlGenerator';
import HighlightedCode from '@/components/HighlightedCode.vue'

export default Vue.extend({
  components: {
    SchemaBuilder,
    DialectPicker,
    HighlightedCode
  },
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
      generator: null,
      template: null,
      sql: null
    }
  },
  watch: {
    dialect() {
      this.generator.dialect = this.dialect
      this.genSql()
    }
  },
  computed :{
    ...mapState(['dialect'])
  },
  methods: {
    genSql() {
      const unformatted = this.generator.buildSql(this.template.toSchema(this.dialect))
      this.sql = Formatter.format(unformatted, { language: 'sql'})
    },
    setTemplate(id: string) {
      this.generator = new SqlGenerator(this.dialect)
      const t = templates.find((t) => t.id === id)
      if (t) {
        this.template = t
        this.genSql()
        return true
      }
      return false
    }
  },
  mounted() {
  }
})
</script>

<style lang="scss" scoped>
  @import '@/assets/styles/app/_variables';

  section {
    padding: $gutter-w * 2;
  }
  .subheader {
    display: flex;
    flex-direction: column;
    background: rgba($query-editor-bg, 0.5);
    padding: $gutter-w * 2;
    a {
      display: flex;
      align-items: center;
    }
    .material-icons {
      width: 24px;
    }
  }
  .table-header {
    margin: 0 0 ($gutter-w * 2);
    .table-name {
      padding: 0;
      margin: 0;
      margin-bottom: $gutter-w;
      display: flex;
      align-items: center;
      .item-icon {
        font-size: 1.6rem;
        margin-right: $gutter-w;
      }
      .badge {
        font-size: 1.05rem;
        padding: 0 $gutter-w;
        margin-left: $gutter-w * 0.75;
        line-height: 1.6;
        background: rgba($theme-base, 0.08);
        color: $text-light;
      }
    }
    .table-description {
      position: relative;
      padding: 0;
      margin: 0;
      cursor: pointer;
      margin-bottom: $gutter-w * 1.5;
    }
    select {
      font-size: 1.1rem;
      line-height: 2.1;
      height: auto;
      min-width: 150px;
    }
  }
  .code-wrap {
    margin-top: $gutter-w * 4;
  }
</style>