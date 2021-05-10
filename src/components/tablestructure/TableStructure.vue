<template>
  <div class="table-structure">
    <div class="table-structure-header">
      <div class="nav-pills">
        <a class="nav-pill active">Schema</a>
        <a class="nav-pill">Indexes</a>
        <a class="nav-pill">Relations</a>
        <a class="nav-pill">Info</a>
        <a class="nav-pill">Triggers</a>
      </div>
    </div>
    <!-- <div ref="tableSchema"></div>
    <div ref="tableIndexes"></div>
    <div ref="tableRelations"></div> -->

    <div ref="tableInfo" class="table-info">
      <div class="small-wrap">
       <div class="card-flat padding">

          <!-- Creation -->
          <div class="row gutter">
            <div class="col s6">
              <div class="form-group inline">
                <label>Created at:</label>
                <span>Feb 11, 2021 at 3:20;18 PM</span>
              </div>
              <div class="form-group inline">
                <label>Updated at:</label>
                <span>Not Available</span>
              </div>
            </div>
            
            <div class="col s6">
              <div class="form-group inline">
                <label>Type:</label>
                <select>
                  <option value="-"></option>
                </select>
              </div>
              <div class="form-group inline">
                <label>Encoding:</label>
                <select>
                  <option value="-"></option>
                </select>
              </div>
              <div class="form-group inline">
                <label>Collation:</label>
                <select>
                  <option value="-"></option>
                </select>
              </div>
            </div>
          </div>
          <hr>

          <!-- Info -->
          <div class="row gutter">
            <div class="col s6">
              <div class="form-group inline">
                <label>Number of row:</label>
                <span>~442,274</span>
              </div>
              <div class="form-group inline">
                <label>Row format:</label>
                <span>Dynamic</span>
              </div>
              <div class="form-group inline">
                <label>Avg. row length:</label>
                <span>46</span>
              </div>
              <div class="form-group inline">
                <label>Auto Increment:</label>
                <span>Not available</span>
              </div>
            </div>
            <div class="col s6">
              <div class="form-group inline">
                <label>Data Size:</label>
                <span>19.6 MiB</span>
              </div>
              <div class="form-group inline">
                <label>Max data Size:</label>
                <span>0 B</span>
              </div>
              <div class="form-group inline">
                <label>Index Size:</label>
                <span>0 B</span>
              </div>
              <div class="form-group inline">
                <label>Free data Size:</label>
                <span>4.0 MiB</span>
              </div>
            </div>
          </div>
          <hr>

          <!-- Comments/Syntax -->
          <div class="form-group">
            <i class="material-icons">keyboard_arrow_right</i>
            Advanced
          </div>
       </div>
      </div>
    </div>

    <!-- <div ref="tableTriggers"></div> -->
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
import Statusbar from '../common/StatusBar'
export default {
  props: ["table", "connection", "tabID", "active"],
  components: { Statusbar },
  data() {
    return {
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