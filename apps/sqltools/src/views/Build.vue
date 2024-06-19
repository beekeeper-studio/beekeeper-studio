<template>
  <div class="home">
    <section class="subheader">
      <div class="small-wrap">
        <h1>SQL Table Creator</h1>
        <div class="subtitle">
          This is a SQL table creator for Postgres, MySQL, SQL Server, SQLite, and Redshift databases from the makers of  <a
            class="text-primary"
            href="https://beekeeperstudio.io"
            target="_blank"
          >Beekeeper Studio</a>. Create a SQL table below using the point and click UI, then copy the output SQL into your database.
        </div>
      </div>
    </section>
    <section>
      <div class="small-wrap">
        <!-- Schema Builder -->
        <schema-builder
          v-if="templateSchema.columns"
          :initial-columns="templateSchema.columns"
          table-height="400"
          :reset-on-update="true"
          @columnsChanged="columnsChanged"
        >
          <div class="table-header flex flex-middle">
            <div class="form-group expand flex flex-middle">
              <input
                type="text"
                v-model="schema.name"
                :placeholder="defaultName"
              >
              <span class="input-icon"><i class="material-icons">edit</i></span>
            </div>
            <dialect-picker
              :confirm="schemaChanges > 0"
              :confirm-message="confirmMessage"
            />
          </div>
          <template />
        </schema-builder>

        <!-- Generated code -->
        <highlighted-code
          :code="formattedSql"
          :dialect="dialect"
        >
          <template>
            <h3 class="title">
              CREATE TABLE Generated SQL ({{ dialectTitle }})
            </h3>
          </template>

          <template
            v-slot:alert
            v-if="dialectWarning"
          >
            <div class="alert alert-warning">
              <i class="material-icons">warning</i>
              <div>{{ dialectWarning }}</div>
            </div>
          </template>
        </highlighted-code>
      </div>
    </section>
    <section>
      <div class="small-wrap text-center">
        <h2>Make SQL Fun Again With Beekeeper Studio</h2>
        <p>
          This SQL table creator is just one of several useful features built into <a
            target="_blank"
            href="https://beekeeperstudio.io"
          >Beekeeper Studio</a>, the SQL editor and database GUI that makes writing SQL fun again. Available for Linux, MacOS, and Windows.
        </p>
        <p class="text-center">
          <img
            src="../assets/img/bk-example.png"
            alt="Beekeeper Studio example"
          >
        </p>
        <p>
          <a
            href="https://beekeeperstudio.io"
            target="_blank"
            class="btn btn-primary"
          >Get Started Free</a>
        </p>
      </div>
    </section>
  </div>
</template>

<script lang="ts">

import Vue from 'vue';
import _ from 'lodash'
import { mapGetters, mapState } from 'vuex'
import { UserTemplate as users } from '../lib/templates/user'
import { DialectTitles, FormatterDialect, Schema, SchemaItem } from '@shared/lib/dialects/models'
import SchemaBuilder from '@shared/components/SchemaBuilder.vue'
import { format } from 'sql-formatter'
import DialectPicker from '@/components/DialectPicker.vue'
import templates from '@/lib/templates';
import HighlightedCode from '@/components/HighlightedCode.vue';
import { Template } from '@shared/lib/dialects/template';

interface Data {
  template: Template
  schema: Schema
  sql?: string,
  schemaChanges: number
  defaultName: string
}


const dialectNotes = {
  sqlite: "Sqlite does not support table or column comments",
}

export default Vue.extend ({
  metaInfo() {
    return {
      title: "SQL Table Creator",
      meta: [
        { name: 'description', content: this.description}
      ]
    }
  },
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
      schemaChanges: 0
    }
  },
  watch: {
    dialect() {
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
    description() {
      if (this.isHome) {
        return "Our SQL table creator lets you generate 'CREATE TABLE' statements using a visual interface. Perfect if you can never remember CREATE TABLE syntax. Works for Postgres, MySQL, Sqlite, SQL Server, and Redshift"
      } else {
        return "SQL Table creator for ${this.template.id}. Use our visual SQL table creator for Postgres, MySQL, Sqlite, SQL Server, or Redshift"
      }
    },
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
      // @ts-ignore
      return format(this.sql, { language: FormatterDialect(this.dialect)})
    }
  },
  methods: {
    generateSql: _.debounce(async function() {
      this.sql = await this.$util.send('generator/build', { schema: this.schema });
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
