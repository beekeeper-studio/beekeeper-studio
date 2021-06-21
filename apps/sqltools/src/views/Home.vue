<template>
  <div class="home">

    <div class="small-wrap">
      <select name="dialect" v-model="dialect" id="dialect-select">
        <option v-for="d in dialects" :key="d" :value="d">{{d}}</option>
      </select>
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
  </div>
</template>

<script lang="ts">

import Vue from 'vue';
import { UserTemplate as users } from '../lib/templates/user'
import SchemaBuilder from '@shared/components/SchemaBuilder.vue'
import { Dialect, Dialects, SchemaItem } from '@shared/lib/dialects/models';
import Formatter from 'sql-formatter'
import Knex from 'knex'
interface Data {
  name: string
  dialect: Dialect,
  dialects: Dialect[],
  sql?: string,
  knex?: Knex
}
export default Vue.extend ({
  name: 'Home',
  components: { 
    SchemaBuilder
  },
  data(): Data {
    return {
      dialects: [...Dialects],
      dialect: 'postgresql',
      name: users.name,
      sql: undefined,
      knex: undefined
    }
  },
  watch: {
    dialect() {
      if(this.dialect) {
        this.knex = Knex({ client: this.dialect})
      }
    },

  },
  computed: {
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
    this.knex = Knex({'dialect': this.dialect})
  }
})
</script>

<style lang="scss" scoped>
  @import '@/assets/styles/app/_variables';

  .home {
    padding: 0 ($gutter-w * 2);
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