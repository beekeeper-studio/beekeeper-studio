<template>
  <div class="table-builder">
    <error-alert v-if="error" :error="error" />
    <div v-show="running">
      <x-progressbar></x-progressbar>
    </div>
    <div class="table-builder-wrap">
      <div class="center-wrap">
        <div class="table-builder-header">
          <div class="form-group" v-if="defaultSchema">
            <label for="schema">Schema</label>
            <input type="text" v-model="tableSchema" :placeholder="defaultSchema">
          </div>
          <div class="form-group">
            <label for="table">Table Name</label>
            <input type="text" v-model="tableName" placeholder="untitled_table">
          </div>
        </div>
        <schema-builder
          :dialect="dialect"
          :resetOnUpdate="true"
          :initialColumns="initialColumns"
          @columnsChanged="handleChange"
          :initialEmit="true"
        ></schema-builder>
      </div>
    </div>
    <span class="expand"></span>
    <status-bar class="tabulator-footer">
      <span class="expand"></span>
      <div class="col flex-right statusbar-actions">
        <x-buttons class="pending-changes">
          <x-button class="btn btn-primary" @click.prevent="create">
            <i v-if="error" class="material-icons">error</i>
            <span>Create Table</span>
          </x-button>
          <x-button class="btn btn-primary" menu>
            <i class="material-icons">arrow_drop_down</i>
            <x-menu>
              <x-menuitem @click.prevent="sql">Copy to SQL</x-menuitem>
            </x-menu>
          </x-button>
        </x-buttons>
      </div>
    </status-bar>
  </div>
</template>
<script lang="ts">
import { mapGetters, mapState } from 'vuex'
import Formatter from 'sql-formatter';
import SchemaBuilder from '@shared/components/SchemaBuilder.vue'
import { SchemaItem, Schema } from '@shared/lib/dialects/models'
import StatusBar from '@/components/common/StatusBar.vue'
import Vue from 'vue'
import { AppEvent } from '@/common/AppEvent'
import { SqlGenerator } from '@shared/lib/sql/SqlGenerator'
import { BasicTable } from '@/lib/data/table_templates'
import _ from 'lodash';
import ErrorAlert from './common/ErrorAlert.vue';
interface Data {
  initialColumns: SchemaItem[]
  tableName: string | null,
  generator?: SqlGenerator,
  columns: SchemaItem[],
  error?: Error,
  running: boolean
  tableSchema?: string
  errorSql?: string
}
export default Vue.extend({
  components: {
    SchemaBuilder,
    StatusBar,
    ErrorAlert,
  },
  props: ['connection', 'tabId'],
  data(): Data {
    return {
      running: false,
      error: undefined,
      tableName: 'untitled_table',
      initialColumns: [
      ],
      generator: undefined,
      columns: [],
      tableSchema: undefined,
      errorSql: undefined
    }
  },
  computed: {
    ...mapGetters(['dialect']),
    ...mapState(['tables']),
    defaultSchema() {
      if (this.dialect === 'postgresql') return 'public'
      if (this.dialect === 'redshift') return 'public'
      if (this.dialect === 'sqlserver') return 'dbo'
      return undefined
    },
    fixedSchema(): string | undefined {
      if (_.isNil(this.tableSchema) || _.isEmpty(this.tableSchema)) {
        return this.defaultSchema
      } else {
        return this.tableSchema
      }
    },
    schema(): Schema {
      return {
        name: this.tableName,
        schema: this.fixedSchema,
        columns: this.columns
      }
    },
    simpleTableName() {
      return this.tableSchema ? `${this.tableSchema}.${this.tableName}` : this.tableName
    }
  },
  methods: {
    handleChange(columns: SchemaItem[]) {
      console.log("handling change")
      this.error = undefined
      this.columns = columns
    },
    async create() {
      this.error = undefined
      const sql = this.generator.buildSql(this.schema);

      try {
        this.running = true
        const running = this.connection.query(sql)
        await running.execute()
        this.success = true
        this.$noty.success(`${this.simpleTableName} created`)
        await this.$store.dispatch('updateTables');
        const newTable = this.tables.find((t) => (
          t.name === this.tableName &&
          ((!this.fixedSchema && !t.schema) || (this.fixedSchema === t.schema))
        ))
        if (newTable) {
          this.$root.$emit(AppEvent.openTableProperties, { table: newTable })
          this.$root.$emit(AppEvent.closeTab, this.tabId)
        }
      } catch (error) {
        this.error = error
        try {
          this.errorSql = Formatter.format(sql, { language: 'sql'})
        } catch (error) {
          // do nothing
        }
      } finally {
        this.running = false
      }
    },
    sql() {
      this.error = undefined
      const sql = (this.generator as SqlGenerator).buildSql(this.schema)
      const formatted = Formatter.format(sql, { language: 'sql'})
      if (sql) {
        this.$root.$emit(AppEvent.newTab, formatted)
      } else {
        this.$noty.error("Invalid table structure")
      }

    }
  },
  mounted() {
    const schema = BasicTable.toSchema(this.dialect)
    this.initialColumns = schema.columns
    this.generator = new SqlGenerator(this.dialect)
  }
})
</script>
