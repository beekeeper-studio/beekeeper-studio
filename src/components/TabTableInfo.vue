<template>
  <div class="table-structure">
      <div class="table-structure-header">
        <div class="nav-pills">
          <a 
            v-for="(pill) in pills"
            :key="pill.id"
            class="nav-pill"
            :class="{active: pill.id === activePill}"
            @click.prevent="activePill = pill.id"
          >
            {{pill.name}}
          </a>
        </div>
      </div>
      <div ref="tableInfo" class="table-info">
        <component
          v-for="(pill) in pills"
          :key="pill.id"
          :is="pill.component"
          :table="table"
          :primaryKeys="primaryKeys"
          :properties="properties"
          :connection="connection"
          :active="pill.id === activePill && active"
          v-show="pill.id === activePill"
        ></component>
      </div>
    <statusbar class="statusbar"></statusbar>
  </div>
</template>

<script>
import Tabulator from 'tabulator-tables'
// import TableSchema from './components/TableSchema'
// import TableIndexes from './components/TableIndexes'
// import TableRelations from './components/TableRelations'
// import TableInfo from './components/TableInfo'
// import TableTriggers from './components/TableTriggers'
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
      properties: { description: "## Placeholder Description\n Some info goes here"},
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
      activePill: 'schema',
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
    const columnWidth = this.table.columns.length > 20 ? 125 : undefined

  }
}
</script>