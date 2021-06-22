<template>
  <div class="template" v-if="template">
    <section class="subheader">
      <div class="big-wrap">
        <h1>{{template.name}} Table Template</h1>
        <p>{{template.description}}</p>
      </div>
      <div class="small-wrap">
        <div class="flex">
          <dialect-picker class="shrink" />
          <span class="expand"></span>
          <div class="actions">
            <router-link :to="{name: 'Build', params: {id: template.id}}" >Open in Table Builder</router-link>
          </div>
        </div>
      </div>

    </section>
    <section>
      <div class="small-wrap">
        <!-- Schema Builder -->
        <schema-builder
          v-if="template"
          :initialSchema="template.toSchema(dialect)"
          :initialName="template.tableName"
          :resetOnUpdate="true"
          :disabled="true"
        >
          <template>
            <span class="table-title">Columns</span>
          </template>
        </schema-builder>

        <div class="code-wrap" v-if="sql">
          <h2>
            Generated SQL
          </h2>
          <highlightjs lang="sql" :code="sql" />
        </div>

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

export default Vue.extend({
  components: {
    SchemaBuilder,
    DialectPicker
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