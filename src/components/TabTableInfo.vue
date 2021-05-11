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
          :connection="connection"
          :active="pill.id === activePill"
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
    tableSchemaColumns() {
      return [
        {title: 'Field', field: 'field'}, 
        {title: 'Type', field: 'type'}, 
        {title: 'Length', field: 'length'},
        {title: 'Unsigned', field: 'unsigned'},
        {title: 'Zerofill', field: 'zerofill'},
        {title: 'Binary', field: 'binary'},
        {title: 'Allow Null', field: 'allowNull'},
        {title: 'Key', field: 'key'},
        {title: 'Definition', field: 'definition'},
        {title: 'Extra', field: 'extra'},
        {title: 'Encoding', field: 'encoding'},
      ]
    },
    tableSchemaData() {
      return this.table.columns.map(() => {
        return {
          field: '', 
          type: '', 
          length: '',
          unsigned: '',
          zerofill: '',
          binary: '',
          allowNull: '',
          key: '',
          definition: '',
          extra: '',
          encoding: '',
        }
      })
    },

    tableIndexesColumns() {
      return [
        {title: 'Non Unique', field: 'nonUnique'}, 
        {title: 'Key Name', field: 'keyName'}, 
        {title: 'Seq in Index', field: 'seqInIndex'},
        {title: 'Column Name', field: 'columnName'},
        {title: 'Collation', field: 'collation'},
        {title: 'Cardinality', field: 'cardinality'},
        {title: 'Sub Part', field: 'subPart'},
        {title: 'Packed', field: 'packed'},
        {title: 'Comment', field: 'comment'},
      ]
    },
    tableIndexesData() {
      return this.table.columns.map(() => {
        return {
          nonUnique: '',
          keyName: '',
          seqInIndex: '',
          columnName: '',
          collation: '',
          cardinality: '',
          subPart: '',
          packed: '',
          comment: '',
        }
      })
    },

    tableRelationsColumns() {
      return [
        {title: 'Name', field: 'name'}, 
        {title: 'Columns', field: 'columns'}, 
        {title: 'FK Database', field: 'fkDatabase'},
        {title: 'FK Table', field: 'fkTable'},
        {title: 'FK Columns', field: 'fkColumns'},
        {title: 'On Update', field: 'onUpdate'},
        {title: 'On Delete', field: 'onDelete'},
      ]
    },
    tableRelationsData() {
      return this.table.columns.map(() => {
        return {
          name: '',
          columns: '',
          fkDatabase: '',
          fkColumns: '',
          onUpdate: '',
          onDelete: '',
        }
      })
    },

    tableTriggersColumns() {
      return [
        {title: 'Trigger', field: 'trigger'}, 
        {title: 'Event', field: 'event'}, 
        {title: 'Timing', field: 'timing'},
        {title: 'Statement', field: 'statement'},
        {title: 'Definer', field: 'definer'},
        {title: 'Created', field: 'created'},
        {title: 'SQL Mode', field: 'sqlMode'},
      ]
    },
    tableTriggersData() {
      return this.table.columns.map(() => {
        return {
          trigger: '',
          event: '',
          timing: '',
          statement: '',
          definer: '',
          created: '',
          sqlMode: '',
        }
      })
    },
  },
  mounted() {
    const columnWidth = this.table.columns.length > 20 ? 125 : undefined
    this.tableSchema = new Tabulator(this.$refs.tableSchema, {
      columns: this.tableSchemaColumns,
      data: this.tableSchemaData,
      height: this.actualTableHeight,
      width: columnWidth,
    })
    this.tableIndexes = new Tabulator(this.$refs.tableIndexes, {
      columns: this.tableIndexesColumns,
      data: this.tableIndexesData,
      height: this.actualTableHeight,
      width: columnWidth,
    })
    this.tableRelations = new Tabulator(this.$refs.tableRelations, {
      columns: this.tableRelationsColumns,
      data: this.tableRelationsData,
      height: this.actualTableHeight,
      width: columnWidth,
    })
    this.tableTriggers = new Tabulator(this.$refs.tableTriggers, {
      columns: this.tableTriggersColumns,
      data: this.tableTriggersData,
      height: this.actualTableHeight,
      width: columnWidth,
    })
  }
}
</script>