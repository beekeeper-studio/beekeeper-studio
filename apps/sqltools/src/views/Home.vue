<template>
  <div class="home">
    <section class="subheader">
      <div class="small-wrap">
        <h1>SQL Table Builder</h1>

        <!-- Alert -->
        <tutorial-alert v-if="isHome" />
        <!-- Dialect with Actions -->
        <div class="flex">
          <dialect-picker class="shrink" :confirm="schemaChanges > 0" :confirmMessage="confirmMessage"/>
          <span class="expand"></span>
        </div>
      </div>
    </section>
    <section>
      <div class="small-wrap">

        <!-- Schema Builder -->
        <schema-builder v-if="template"
          :initialSchema="schema"
          :initialName="template.name"
          :resetOnUpdate="true"
          @schemaChanged="schemaChanged"
        >
          <template>
            <span class="table-title">Columns</span>
          </template>
        </schema-builder>

        <div class="code-wrap" v-if="formattedSql">
          <h3>
            Generated SQL for {{dialectTitle}}
          </h3>
          <p class="dialect-warning">{{dialectWarning ? `*${dialectWarning}`: ''}}</p>
          <highlightjs :lang="highlightDialect" :code="formattedSql" />
        </div>
      </div>
    </section>
    <footer>
      <div class="small-wrap flex-col flex-middle">
        <small class="created-by">
          <span>Made by&nbsp;</span>
          <router-link to="https://beeekeeperstudio.io">Beekeeper Studio</router-link>
        </small>
      </div>
    </footer>
  </div>
</template>

<script lang="ts">

import Vue from 'vue';
import { mapGetters, mapState } from 'vuex'
import { UserTemplate as users } from '../lib/templates/user'
import { DialectTitles, Schema } from '@shared/lib/dialects/models'
import SchemaBuilder from '@shared/components/SchemaBuilder.vue'
import Formatter from 'sql-formatter'
import Knex from 'knex'
import { SqlGenerator } from '@shared/lib/sql/SqlGenerator';
import TutorialAlert from '@/components/TutorialAlert.vue';
import { Template } from '@/lib/templates/base';
import templates from '@/lib/templates';
interface Data {
  template: Template
  sql?: string,
  knex?: Knex,
  generator: SqlGenerator
  schemaChanges: number
}


const dialectNotes = {
  sqlite: "Sqlite does not support table or column comments",
}

export default Vue.extend ({
  name: 'Home',
  components: { 
    SchemaBuilder,
    TutorialAlert
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
      sql: undefined,
      knex: undefined,
      generator: undefined,
      schemaChanges: 0
    }
  },
  watch: {
    dialect() {
      this.generator.dialect = this.dialect
      this.schemaChanges = 0
    },
  },
  computed: {
    ...mapState(['dialect']),
    ...mapGetters(['knexDialect']),
    isHome() {
      return this.$route.name === 'Home'
    },
    confirmMessage() {
      return `You will lose ${this.schemaChanges} changes, continue?`
    },
    highlightDialect() {
      switch (this.dialect) {
        case 'postgresql':
        case 'redshift':
          return 'pgsql'
        default:
          return 'sql'
      }
    },
    dialectWarning() {
      return dialectNotes[this.dialect]
    },
    dialectTitle() {
      return DialectTitles[this.dialect]
    },
    schema() {
      return this.template.toSchema(this.dialect)
    },
    formattedSql() {
      // TODO (map dialects)
      if (!this.sql) return null
      return Formatter.format(this.sql, { language: 'sql'})
    }
  },
  methods: {
    initialize(id?: string) {
      this.generator = new SqlGenerator(this.dialect)
      this.template = id ? templates.find((t) => t.id === id) : users
      // if (!this.id) this.$router.replace({query: {}})
      if (!this.template) return
      this.knex = Knex({client: this.knexDialect})
      this.sql = this.generator.buildSql(this.schema)
    },
    schemaChanged(schema: Schema) {
      console.log("Schema change", schema)
      this.schemaChanges += 1
      this.sql = this.generator.buildSql(schema)
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
  }
  .alert {
    position: relative;
    margin-bottom: $gutter-w * 2;
    line-height: 1.8;
    .close-btn {
      position: absolute;
      top: $gutter-h;
      right: $gutter-h;
      &:hover {
        .material-icons {
          color: $text-dark
        }
      }
      .material-icons {
        color: $text-lighter;
        transition: color 0.2s ease-in-out;
      }
    }
  }

  .code-wrap {
    margin-top: $gutter-w * 4;
  }

  // Footer
  footer {
    padding: $gutter-w * 2;
    padding-top: $gutter-w * 4;
    padding-bottom: $gutter-w * 6;
    a {
      color: $theme-primary;
    }
    .created-by {
      display: flex;
      align-items: center;
    }
  }
</style>