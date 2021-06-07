<template>
  <div class="table-properties">
    <div v-if="error" class="alert-wrapper">
      <div class="alert alert-danger">
        {{error.message}}
      </div>
    </div>
    <template  v-else>
      <div v-if="loading" class="table-properties-loading">
        <x-progressbar></x-progressbar>
      </div>
      <div class="table-properties-wrap" >
        <div class="center-wrap" v-if="!loading">
          <div v-for="(pill) in pills" :key="pill.id" ref="tableInfo" class="table-properties-content">
            <component
              :is="pill.component"
              :table="table"
              :primaryKeys="primaryKeys"
              :properties="properties"
              :connection="connection"
              :active="active"
              
            ></component>
          </div>
        </div>
      </div>
    </template>

    <span class="expand"></span>
    <statusbar class="tabulator-footer">
      <div class="col truncate expand" v-if="properties">
        <span class="statusbar-item" :title="`${properties.length} Records`">
          <i class="material-icons">list_alt</i>
          <span v-if="properties.length">~{{properties.length.toLocaleString()}}</span>
        </span>
        <span class="statusbar-item" :title="`Table Size ${humanSize}`">
          <i class="material-icons">aspect_ratio</i>
          <span>{{humanSize}}</span>
        </span>
        <span class="statusbar-item" :title="`Index Size ${humanIndexSize}`">
          <i class="material-icons">location_searching</i>
          <span>{{humanIndexSize}}</span>
        </span>

      </div>
      <div class="col flex-right statusbar-actions">
        <x-button class="actions-btn btn btn-flat" title="Actions">
          <i class="material-icons">settings</i>
          <i class="material-icons">arrow_drop_down</i>
          <x-menu>
            <x-menuitem @click.prevent="refresh">
              <x-label>Refresh</x-label>
            </x-menuitem>
            <x-menuitem @click.prevent="openTable">
              <x-label>View Data</x-label>
            </x-menuitem>
            <hr v-if="dev">
            <x-menuitem v-if="dev" @click.prevent="triggerError">
              <x-label>[DEV] Toggle Error</x-label>
            </x-menuitem>
            <x-menuitem v-if="dev" @click.prevent="loading = !loading">
              <x-label>[DEV] Toggle Loading</x-label>
            </x-menuitem>
            
          </x-menu>
        </x-button>
      </div>
    </statusbar>
  </div>
</template>

<script>
import Tabulator from 'tabulator-tables'
import Statusbar from './common/StatusBar'
import TableInfoVue from './tableinfo/TableInfo.vue'
import TableSchemaVue from './tableinfo/TableSchema.vue'
import TableIndexesVue from './tableinfo/TableIndexes.vue'
import TableRelationsVue from './tableinfo/TableRelations.vue'
import TableTriggersVue from './tableinfo/TableTriggers.vue'
import { format as humanBytes } from 'bytes'
import platformInfo from '../common/platform_info'
export default {
  props: ["table", "connection", "tabID", "active"],
  components: { Statusbar },
  data() {
    return {
      dev: platformInfo.isDevelopment,
      loading: true,
      error: null,
      primaryKeys: [],
      properties: {},
      rawPills: [
        {
          id: 'info',
          name: 'Info',
          needsProperties: false,
          component: TableInfoVue,
        },
        {
          id: 'schema',
          name: "Schema",
          needsProperties: false,
          component: TableSchemaVue,
        },
        {
          id: 'indexes',
          name: "Indexes",
          tableOnly: true,
          needsProperties: true,
          component: TableIndexesVue,
        },
        {
          id: 'relations',
          name: "Relations",
          tableOnly: true,
          needsProperties: true,
          component: TableRelationsVue,
        },
        {
          id: 'triggers',
          name: "Triggers",
          tableOnly: true,
          needsProperties: true,
          component: TableTriggersVue
        }
      ],
      activePill: 'info',
      tableSchema: null,
      tableIndexes: null,
      tableRelations: null,
      tableTriggers: null,
      actualTableHeight: "100%",
    }
  },
  computed: {
    pills() {
      if (!this.table) return []
      const isTable = this.table.entityType === 'table'
      return this.rawPills.filter((p) => {

        if (!this.properties) {
          if (p.needsProperties) {
            return false
          }
        }
        
        if (p.needsProperties && !this.connection.supportedFeatures().properties) {
          return false
        }
        if(p.tableOnly) {
          return isTable
        }
        return true
      })
    },
    humanSize() {
      return humanBytes(this.properties.size)
    },
    humanIndexSize() {
      return humanBytes(this.properties.indexSize)
    }
  },
  methods: {
    triggerError() {
      // this is for dev only
      this.error = new Error("Something went wrong")
    },
    async refresh() {
      this.loading = true
      this.error = null
      this.properties = null
      try {
        this.primaryKeys = await this.connection.getPrimaryKeys(this.table.name, this.table.schema)
        this.properties = await this.connection.getTableProperties(this.table.name, this.table.schema)
        this.loading = false
      } catch (ex) {
        this.error = ex
      } finally {
        this.loading = false
      }
    },
    async openTable() {
      this.$root.$emit("loadTable", { table: this.table })
    }
  },
  async mounted() {
    this.refresh()
  }
}
</script>