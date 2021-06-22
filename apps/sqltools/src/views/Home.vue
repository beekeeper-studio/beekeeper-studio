<template>
  <div class="home">
    <section class="subheader">
      <div class="small-wrap flex">
        <dialect-picker class="shrink" />
        <span class="expand"></span>
        <div class="actions">
          <x-buttons class="export">
            <x-button class="btn btn-info">
              Export
            </x-button>
            <x-button class="btn btn-info" menu>
              <i class="material-icons">arrow_drop_down</i>
              <x-menu  style="--target-align: right;">
                <x-menuitem @click.prevent="">
                  <x-label>Item 1</x-label>
                </x-menuitem>
                <x-menuitem @click.prevent="">
                  <x-label>Item 2</x-label>
                </x-menuitem>
              </x-menu>
            </x-button>
          </x-buttons>
        </div>
      </div>
    </section>
    <section>
      <div class="small-wrap">
        <div class="alert" v-if="!dismissedTutorial">
          <span>sdfsdfs</span>
          <a class="btn" @click="dismissTutorial">Button</a>
        </div>
        <schema-builder
          :initialSchema="schema"
          :initialName="name"
          :resetOnUpdate="true"
          @schemaChanged="schemaChanged"
        >
          <template>
            <span class="table-title">Schema Builder</span>
          </template>
        </schema-builder>
        <div class="code-wrap" v-if="formattedSql">
          <highlightjs lang="sql" :code="formattedSql" />
        </div>
      </div>
    </section>
  </div>
</template>

<script lang="ts">

import Vue from 'vue';
import { mapGetters, mapState } from 'vuex'
import { UserTemplate as users } from '../lib/templates/user'
import DialectPicker from '@/components/DialectPicker.vue'
import { Schema } from '@shared/lib/dialects/models'
import SchemaBuilder from '@shared/components/SchemaBuilder.vue'
import Formatter from 'sql-formatter'
import Knex from 'knex'
import { SqlGenerator } from '@shared/lib/sql/SqlGenerator';
interface Data {
  name: string
  sql?: string,
  knex?: Knex,
  generator: SqlGenerator
}
export default Vue.extend ({
  name: 'Home',
  components: { 
    SchemaBuilder,
    DialectPicker
  },
  data(): Data {
    return {
      name: users.name,
      sql: undefined,
      knex: undefined,
      generator: undefined
    }
  },
  watch: {
    dialect() {
      this.generator.dialect = this.dialect
    },

  },
  computed: {
    ...mapState(['dialect', 'dismissedTutorial']),
    ...mapGetters(['knexDialect']),
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
      this.sql = this.generator.buildSql(schema)
    },
    dismissTutorial() {
      this.$store.commit('setDismissedTutorial')
    }
  },
  mounted() {
    this.knex = Knex({'dialect': this.knexDialect})
    this.generator = new SqlGenerator(this.dialect)
  }
})
</script>

<style lang="scss" scoped>
  @import '@/assets/styles/app/_variables';

  section {
    padding: $gutter-w * 2;
  }
  .subheader {
    // background: rgba($query-editor-bg, 0.5);
    background: $query-editor-bg;
    padding: $gutter-w * 2;
  }
  .table-header {
    padding: $gutter-w 0;
    .table-title {
      font-weight: bold;
      font-size: 1.25rem;
      margin: 0;
      color: $text-dark;
    }
  }
</style>