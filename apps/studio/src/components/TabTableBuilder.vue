<template>
  <div
    class="table-builder"
    v-hotkey="hotkeys"
  >
    <error-alert
      v-if="error"
      :error="error"
    />
    <div v-show="running">
      <x-progressbar />
    </div>
    <div class="table-builder-wrap">
      <div class="center-wrap">
        <div class="table-builder-header">
          <div
            class="form-group"
            v-if="defaultSchema"
          >
            <label for="schema">Schema</label>
            <input
              type="text"
              v-model="tableSchema"
              :placeholder="defaultSchema"
            >
          </div>
          <div class="form-group">
            <label for="table">Table Name</label>
            <input
              type="text"
              v-model="tableName"
              placeholder="untitled_table"
            >
          </div>
        </div>
        <schema-builder
          ref="sb"
          :dialect="dialect"
          :reset-on-update="true"
          :initial-columns="initialColumns"
          @columnsChanged="handleChange"
          :initial-emit="true"
        />
      </div>
    </div>
    <div class="expand" />
    <status-bar class="tabulator-footer">
      <span class="expand" />
      <div class="col flex-right statusbar-actions">
        <x-buttons class="pending-changes">
          <x-button
            class="btn btn-primary"
            @click.prevent="create"
          >
            <i
              v-if="error"
              class="material-icons"
            >error</i>
            <span>Create Table</span>
          </x-button>
          <x-button
            class="btn btn-primary"
            menu
          >
            <i class="material-icons">arrow_drop_down</i>
            <x-menu>
              <x-menuitem @click.prevent="create">
                <x-label>Create Table</x-label>
                <x-shortcut value="Control+S" />
              </x-menuitem>
              <x-menuitem @click.prevent="sql">
                <x-label>Copy to SQL</x-label>
                <x-shortcut value="Control+Shift+S" />
              </x-menuitem>
            </x-menu>
          </x-button>
        </x-buttons>
      </div>
    </status-bar>
  </div>
</template>
<script lang="ts">
import { mapGetters, mapState } from 'vuex'
import { format } from 'sql-formatter';
import SchemaBuilder from '@shared/components/SchemaBuilder.vue'
import { SchemaItem, Schema, FormatterDialect } from '@shared/lib/dialects/models'
import StatusBar from '@/components/common/StatusBar.vue'
import Vue from 'vue'
import { AppEvent } from '@/common/AppEvent'
import { BasicTable } from '@/lib/data/table_templates'
import _ from 'lodash';
import ErrorAlert from './common/ErrorAlert.vue';
import { CancelableQuery } from '@/lib/db/models';
interface Data {
  initialColumns: SchemaItem[]
  tableName: string | null,
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
  props: ['tabId', 'active'],
  data(): Data {
    return {
      running: false,
      error: undefined,
      tableName: 'untitled_table',
      initialColumns: [
      ],
      columns: [],
      tableSchema: undefined,
      errorSql: undefined
    }
  },
  computed: {
    ...mapGetters(['dialect']),
    ...mapState(['tables', 'defaultSchema', 'usedConfig', 'connection']),
    hotkeys() {
      if (!this.active) {
        return {}
      }
      const results = {}

      results[this.ctrlOrCmd('s')] = this.create.bind(this)
      results[this.ctrlOrCmd('shift+s')] = this.sql.bind(this)
      results[this.ctrlOrCmd('n')] = () => this.$refs.sb.addRow()
      return results
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
      this.error = undefined
      this.columns = columns
    },
    async create() {
      this.error = undefined
      const sql = await this.$util.send('generator/build', { schema: this.schema });

      try {
        this.running = true
        const runningQuery: CancelableQuery = await this.connection.query(sql);
        await runningQuery.execute();
        this.success = true
        this.$noty.success(`${this.simpleTableName} created`)
        await this.$store.dispatch('updateTables');
        const newTable = this.tables.find((t) => (
          t.name === this.tableName &&
          ((!this.fixedSchema && !t.schema) || (this.fixedSchema === t.schema))
        ))
        if (newTable) {
          this.$root.$emit(AppEvent.openTableProperties, { table: newTable })
          this.$root.$emit(AppEvent.closeTab, this.tabId, { ignoreUnsavedChanges: true })
        }
      } catch (error) {
        this.error = error
        try {
          this.errorSql = format(sql, { language: FormatterDialect(this.dialect)})
        } catch (error) {
          // do nothing
        }
      } finally {
        this.running = false
      }
    },
    async sql() {
      this.error = undefined
      const sql = await this.$util.send('generator/build', { schema: this.schema });
      const formatted = format(sql, { language: FormatterDialect(this.dialect)})
      if (sql) {
        this.$root.$emit(AppEvent.newTab, formatted)
      } else {
        this.$noty.error("Invalid table structure")
      }

    }
  },
  beforeMount() {
    const schema = BasicTable.toSchema(this.dialect)
    this.initialColumns = schema.columns
  },
})
</script>
