<template>
  <section class="import-section-wrapper schema-builder">
    <div class="card-flat padding">
      <h3 class="card-title">
        Select or Create Table
      </h3>
      <div>
        blerns
      </div>
      <div>
        <form
          v-for="(schemaTable, index) in this.schemaTables" :key="index"
          class="import-table-form"
        >
          <div v-for="(tableData, tIndex) in schemaTable.tables" :key="tIndex">
            <label>
              <input type="radio" :value="tableKeyByTable(schemaTable.schema, tableData.name)" v-model="selectedTable">
              {{ tableData.name }}
            </label>
          </div>
        </form>
      </div>
    </div>
  </section>
</template>

<script>
import { mapGetters, mapState } from 'vuex'
import { escapeHtml } from '@shared/lib/tabulator'
export default {
  components: {

  },
  props: {
    stepperProps: {
      type: Object,
      required: true,
      default: () => ({
        schema: null,
        table: null,
        tabId: null
      })
    },
  },
  data() {
    return {
      importerId: null,
      table: null,
      selectedTable: null
    }
  },
  computed: {
    ...mapGetters(['schemaTables']),
    ...mapGetters('imports', {'getImportOptions': 'getImportOptions'}),
    ...mapState('imports', {'tablesToImport': 'tablesToImport'}),
  },
  methods: {
    getTable({schema, name: tableName}) {
      let foundSchema = ''
      if (this.schemaTables.length > 1) {
        foundSchema = this.schemaTables.find(s => s.schema === schema)
      } else {
        foundSchema = this.schemaTables[0]
      }
      return foundSchema.tables.find(t => t.name === tableName)
    },
    tableKey() {
      if (!this.stepperProps.schema && !this.stepperProps.table) return `new-table-${this.stepperProps.tabId}`
      const schema = this.stepperProps.schema ? `${this.stepperProps.schema}_` : ''
      return `${schema}${this.stepperProps.table}`
    },
    tableKeyByTable(schema, tableName){
      if (!schema && !tableName) return null
      const schemaTxt = schema ? `${schema}_` : ''
      console.log(schema, tableName, `${schemaTxt}${tableName}`)
      return `${schemaTxt}${tableName}`
    },
    async onFocus () {
      const importOptions = await this.tablesToImport.get(this.tableKey())
      if (importOptions.importMap && this.importerId && this.tabulator) {
        this.tabulator.redraw()
      } else {
        this.initialize()
      }
    },
    canContinue() {

      return true
    },
    async onNext() {
      const importOptions =  await this.tablesToImport.get(this.tableKey())
      // importOptions.importMap = await this.$util.send('import/mapper', { id: this.importerId, dataToMap: this.tabulator.getData() })
      importOptions.truncateTable = this.truncateTable
      importOptions.runAsUpsert = this.runAsUpsert

      const importData = {
        table: this.tableKey(),
        importProcessId: this.importerId,
        importOptions
      }
      this.$store.commit('imports/upsertImport', importData)
    },
    async initialize () {
      const importOptions = await this.tablesToImport.get(this.tableKey())
      this.selectedTable = this.tableKeyByTable(this.stepperProps.schema, this.stepperProps.table)
      // this.table = this.getTable(importOptions.table)
      // if (!this.table.columns) {
      //   await this.$store.dispatch('updateTableColumns', this.table)
      //   this.table = this.getTable(importOptions.table)
      // }

      // this.initTabulator()
    },
  },
  mounted () {
    this.initialize()
  },
  unmounted() {
    if (this.tabulator) this.tabulator.destroy()
  }
}
</script>

<style lang="scss" scoped>
  .mapper-wrapper {
    margin-top: 2rem;
  }
  .checkbox-group:last-of-type {
    padding-top: 1rem;
  }

  .import-table-form {
    display: flex;
    justify-content: space-between;
    flex-wrap: wrap;
    div {
      width: 33%;
      display: flex;
      align-items: center;
      padding-bottom:.5rem;
    }
  }
</style>
