<template>
  <div class="home">
    <section class="subheader">
      <div class="small-wrap">
        <h1>SQL Table Builder</h1>

        <!-- Alert -->
        <tutorial-alert />
      </div>
    </section>
    <section>
      <div class="small-wrap">

        <!-- Schema Builder -->
        <schema-builder
          :initialSchema="schema"
          :initialName="name"
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
interface Data {
  name: string
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
  data(): Data {
    return {
      name: users.name,
      sql: undefined,
      knex: undefined,
      generator: undefined,
      schemaChanges: 0
    }
  },
  watch: {

  },
  computed: {
    ...mapState(['dialect', 'dismissedTutorial']),
    ...mapGetters(['knexDialect']),
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
    dialectTitle() {
      return DialectTitles[this.dialect]
    },
    schema() {
      return users.toSchema(this.dialect)
    },
    formattedSql() {
      // TODO (map dialects)
      if (!this.sql) return null
      return Formatter.format(this.sql, { language: 'sql'})
    }
  },
  methods: {
    schemaChanged(schema: Schema) {
      this.schemaChanges += 1
      this.sql = this.generator.buildSql(schema)
    },
    dismissTutorial() {
      this.$store.commit('setDismissedTutorial')
    }
  },
  mounted() {
    this.knex = Knex({'dialect': this.knexDialect})
    this.generator = new SqlGenerator(this.dialect)
    this.sql = this.generator.buildSql(this.schema)
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