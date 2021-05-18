<template>
  <div class="table-properties">
    <div class="table-properties-wrap">
      <div class="center-wrap" v-if="properties && table">
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
    <span class="expand"></span>
    <statusbar class="tabulator-footer">
      <div class="expand" v-if="properties">
        <span class="statusbar-item" :title="`${properties.length} Records`">
          <i class="material-icons">list_alt</i>
          <span v-if="properties.length">~{{properties.length.toLocaleString()}}</span>
        </span>
        <span class="statusbar-item" :title="`Table Size ${humanSize}`">
          <i class="material-icons">table</i>
          <span>{{humanSize}}</span>
        </span>
        <span class="statusbar-item" :title="`Index Size ${humanIndexSize}`">
          <i class="material-icons">find_in_page</i>
          <span>{{humanIndexSize}}</span>
        </span>

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
import { humanBytes } from '../common/utils'
export default {
  props: ["table", "connection", "tabID", "active"],
  components: { Statusbar },
  data() {
    return {
      primaryKeys: [],
      properties: {},
      rawPills: [
        {
          id: 'info',
          name: 'Info',
          component: TableInfoVue,
        },
        {
          id: 'schema',
          name: "Schema",
          component: TableSchemaVue,
        },
        {
          id: 'indexes',
          name: "Indexes",
          tableOnly: true,
          component: TableIndexesVue,
        },
        {
          id: 'relations',
          name: "Relations",
          tableOnly: true,
          component: TableRelationsVue,
        },
        {
          id: 'triggers',
          name: "Triggers",
          tableOnly: true,
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
        if(p.tableOnly) {
          return isTable
        } else {
          return true
        }
      })
    },
    humanSize() {
      return humanBytes(this.properties.size)
    },
    humanIndexSize() {
      return humanBytes(this.properties.indexSize)
    }
  },
  async mounted() {
    console.log("properties mounted")
    this.primaryKeys = await this.connection.getPrimaryKeys(this.table.name, this.table.schema)
    this.properties = await this.connection.getTableProperties(this.table.name, this.table.schema)
    const columnWidth = this.table.columns.length > 20 ? 125 : undefined


  }
}
</script>