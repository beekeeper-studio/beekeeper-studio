<template>
  <div class="table-properties">
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
    <statusbar class="tabulator-footer">
      <div class="properties-content" v-if="properties">
        <span :title="`Table Size ${properties.size}`"><i class="material-icons">table</i> {{properties.size}}</span>
        <span :title="`Index Size ${properties.indexSize}`"><i class="material-icons">find_in_page</i> {{properties.indexSize}}</span>
        <span :title="`${properties.length} Records`"><i class="material-icons">list_alt</i>~{{properties.length}}</span>
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
export default {
  props: ["table", "connection", "tabID", "active"],
  components: { Statusbar },
  data() {
    return {
      primaryKeys: [],
      properties: {},
      pills: [
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
          component: TableIndexesVue,
        },
        {
          id: 'relations',
          name: "Relations",
          component: TableRelationsVue,
        },
        {
          id: 'triggers',
          name: "Triggers",
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
  },
  async mounted() {
    this.primaryKeys = await this.connection.getPrimaryKeys(this.table.name, this.table.schema)
    this.properties = await this.connection.getTableProperties(this.table.name, this.table.schema)
    const columnWidth = this.table.columns.length > 20 ? 125 : undefined


  }
}
</script>