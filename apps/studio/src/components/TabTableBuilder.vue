<template>
  <div class="table-builder">
    <div v-if="error" class="alert-wrapper">
      <div class="alert alert-danger">{{error.message}}</div>
    </div>
    <div v-if="running">
      <p>Creating {{tableName}}...</p>
      <x-progressbar></x-progressbar>
    </div>
    <div class="table-builder-wrap">
      <div class="form-group" v-if="defaultSchema">
        <label for="schema">Schema</label>
        <input type="text" v-model="tableSchema" :placeholder="defaultSchema">
      </div>
      <div class="form-group">
        <label for="table">Table Name</label>
        <input type="text" v-model="tableName" placeholder="untitled_table">
      </div>

      <schema-builder
        :dialect="dialect"
        :resetOnUpdate="false"
        :initialColumns="initialColumns"
        @columnsChanged="handleChange"
      ></schema-builder>
    </div>
    <span class="expand"></span>
    <status-bar>
      <div class="col flex-right statusbar-actions">
        <x-button class="actions-btn btn btn-flat" title="Actions">
          <i class="material-icons">settings</i>
          <i class="material-icons">arrow_drop_down</i>
          <x-menu>
            <x-menuitem @click.prevent="create">Create</x-menuitem>
            <x-menuitem @click.prevent="sql">Open as SQL</x-menuitem>
          </x-menu>
        </x-button>
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
interface Data {
  initialColumns: SchemaItem[]
  tableName: string | null,
  generator?: SqlGenerator,
  columns: SchemaItem[],
  error?: Error,
  running: boolean
  tableSchema?: string
}
export default Vue.extend({
  components: {
    SchemaBuilder,
    StatusBar
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
      tableSchema: undefined
    }
  },
  computed: {
    ...mapGetters(['dialect']),
    ...mapState(['tables']),
    defaultSchema() {
      if (this.dialect === 'postgresql') return 'public'
      if (this.dialect === 'sqlserver') return 'dbo'
      return undefined
    },
    schema(): Schema {
      return {
        name: this.tableName,
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
          ((!this.tableSchema && !t.schema) || (this.tableSchema === t.schema))
        ))
        if (newTable) {
          this.$root.$emit(AppEvent.openTableProperties, { table: newTable })
          this.$root.$emit(AppEvent.closeTab, this.tabId)
        }

      } catch (error) {
        this.error = error
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
    this.generator = new SqlGenerator(this.dialect)
  }
})
</script>