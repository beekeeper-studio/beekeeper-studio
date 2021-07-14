<template>
  <div class="home">
    <section class="subheader">
      <div class="small-wrap">
        <h1>SQL Table Builder</h1>
        <div class="subtitle">This is a SQL table builder for Postgres, MySQL, SQL Server, SQLite, and Redshift databases from the makers of  <a class="text-primary" href="https://beekeeperstudio.io" target="_blank">Beekeeper Studio</a>. We also provide some simple sql table starter templates, check them out above 👆.</div>
      </div>
    </section>
    <section>
      <div class="small-wrap">

        <!-- Schema Builder -->
        <schema-builder v-if="templateSchema.columns"
          :initialColumns="templateSchema.columns"
          :resetOnUpdate="true"
          @columnsChanged="columnsChanged"
        >
          <div class="table-header flex flex-middle">
            <div class="form-group expand flex flex-middle">
              <input type="text" v-model="schema.name" :placeholder="defaultName">
              <span class="input-icon"><i class="material-icons">edit</i></span>
            </div>
            <dialect-picker :confirm="schemaChanges > 0" :confirmMessage="confirmMessage"/>
          </div>
          <template></template>
        </schema-builder>

        <!-- Generated code -->
        <highlighted-code :code="formattedSql" :dialect="dialect">
          <template>
            <h3 class="title">Generated SQL for {{dialectTitle}}</h3>
          </template>
          
          <template v-slot:alert v-if="dialectWarning">
            <div class="alert alert-warning">
            <i class="material-icons">warning</i>
            <div>{{dialectWarning}}</div>
          </div>
          </template>
        </highlighted-code>

      </div>
    </section>
  </div>
</template>

<script lang="ts">

import Vue from 'vue';
import _ from 'lodash'
import { mapGetters, mapState } from 'vuex'
import { UserTemplate as users } from '../lib/templates/user'
import { DialectTitles, Schema, SchemaItem } from '@shared/lib/dialects/models'
import SchemaBuilder from '@shared/components/SchemaBuilder.vue'
import Formatter from 'sql-formatter'
import Knex from 'knex'
import { SqlGenerator } from '@shared/lib/sql/SqlGenerator';
import DialectPicker from '@/components/DialectPicker.vue'
import { Template } from '@/lib/templates/base';
import templates from '@/lib/templates';
import HighlightedCode from '@/components/HighlightedCode.vue';
interface Data {
  template: Template
  schema: Schema
  sql?: string,
  knex?: Knex,
  generator: SqlGenerator
  schemaChanges: number
  defaultName: string
}


const dialectNotes = {
  sqlite: "Sqlite does not support table or column comments",
}

export default Vue.extend ({
  name: 'Home',
  components: { 
    SchemaBuilder,
    DialectPicker,
    HighlightedCode
  },
  beforeRouteEnter(to, _from, next) {
    next((component: any) => {
      component.initialize(to.params.id)
      if (!component.template) return "/"
    })
  },
  beforeRouteUpdate(to, _from, next) {
    this.initialize(to.params.id)
    if (!this.template) next('/')
  },
  data(): Data {
    return {
      template: null,
      defaultName: 'untitled_table',
      schema: {
        name: 'untitled_table',
        columns: null
      },
      sql: undefined,
      generator: undefined,
      schemaChanges: 0
    }
  },
  watch: {
    dialect() {
      this.generator.dialect = this.dialect
      this.schemaChanges = 0
      this.schema.columns = this.templateSchema.columns
    },
    schema: {
      deep: true,
      handler() {
        this.generateSql()
      }
    },
  },
  computed: {
    ...mapState(['dialect']),
    ...mapGetters(['knexDialect']),
    isHome() {
      return this.$route.name === 'BuildRoot'
    },
    confirmMessage() {
      return `You will lose ${this.schemaChanges} changes, continue?`
    },
    templateSchema() {
      return this.template ? this.template.toSchema(this.dialect) : []
    },
    dialectWarning() {
      return dialectNotes[this.dialect]
    },
    dialectTitle() {
      return DialectTitles[this.dialect]
    },
    formattedSql() {
      // TODO (map dialects)
      if (!this.sql) return null
      return Formatter.format(this.sql, { language: 'sql'})
    }
  },
  methods: {
    generateSql: _.debounce(function() {
      this.sql = this.generator.buildSql(this.schema)
    }, 300),
    initialize(id?: string) {
      this.template = id ? templates.find((t) => t.id === id) : users
      // if (!this.id) this.$router.replace({query: {}})
      if (!this.template) return
      this.schema = _.clone(this.templateSchema)
    },
    columnsChanged(columns: SchemaItem[]) {
      this.schema.columns = columns
      this.schemaChanges += 1
    }
  },
  mounted() {
      this.generator = new SqlGenerator(this.dialect)
  }
})
</script>

<style lang="scss" scoped>
  .title {
    margin: 0;
  }
  .alert {
    margin: 0;
  }
</style>