<template>
  <div class="home">
    <section class="subheader">
      <div class="small-wrap flex">
        <dialect-picker class="shrink" />
        <span class="expand"></span>
        <div class="actions">
          <a class="btn btn-info">Export</a>
        </div>
      </div>
    </section>
    <section>
      <div class="small-wrap">
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
import SchemaBuilder from '@shared/components/SchemaBuilder.vue'
import DialectPicker from '@/components/DialectPicker.vue'
import { SchemaItem } from '@shared/lib/dialects/models'
import Formatter from 'sql-formatter'
import Knex from 'knex'
interface Data {
  name: string
  sql?: string,
  knex?: Knex
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
      knex: undefined
    }
  },
  watch: {
    knexDialect() {
      if(this.knexDialect) {
        this.knex = Knex({ client: this.knexDialect})
      }
    },

  },
  computed: {
    ...mapState(['dialect']),
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
    schemaChanged(schema: SchemaItem[]) {
      
      const k = this.knex
      this.sql = k.schema.createTable(this.name, (table) => {
        schema.forEach((column: SchemaItem) => {
          const col = table.specificType(column.columnName, column.dataType)

          if (column.primaryKey) col.primary()
          if (column.nullable) col.nullable()
        })
      }).toQuery()
    }
  },
  mounted() {
    this.knex = Knex({'dialect': this.knexDialect})
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