<template>
  <section class="import-section-wrapper schema-builder">
    <div class="card-flat padding">
      <h3 class="card-title">
        Select or Create Table
      </h3>
      <div>
        <form v-for="(schemaTable, index) in this.schemaTables" :key="index">
          <p>{{ schemaTable.schema ?? '' }}</p>
          <div class="import-table-form">
            <div v-for="(tableData, tIndex) in schemaTable.tables" :key="tIndex">
              <label>
                <input type="radio" :value="tableKeyByMatrix({ schema: schemaTable.schema, name: tableData.name})" v-model="selectedTable">
                {{ tableData.name }}
              </label>
            </div>
          </div>
        </form>
      </div>
    </div>
    <div class="card-flat padding table-switch">
      <label for="createTableSwitch">
        Create Table from Import File
      </label>
      <x-switch
        id="createTableSwitch"
        @click.prevent="updateTableSwitch"
        :toggled="createTableFromFile"
      />
    </div>
  </section>
</template>

<script>
import { mapGetters, mapState } from 'vuex'
import ToggleFormArea from '../common/ToggleFormArea.vue'
export default {
  components: {
    
  },
  props: {
    stepperProps: {
      type: Object,
      required: true,
      default: () => ({
        tabId: null
      })
    },
  },
  data() {
    return {
      importerId: null,
      table: null,
      selectedTable: null,
      createTableFromFile: false
    }
  },
  computed: {
    ...mapGetters(['schemaTables']),
    ...mapGetters('imports', {'getImportOptions': 'getImportOptions'}),
    ...mapState('imports', {'tablesToImport': 'tablesToImport'}),
  },
  methods: {
    updateTableSwitch() {
      this.createTableFromFile = !this.createTableFromFile
      if (this.createTableFromFile) this.selectedTable = null
    },
    getTable() {
      if (!this.selectedTable) return null

      const tableNameSplit = this.selectedTable.split('==|==')
      let tableName = ''
      let schema = ''
      let foundSchema = ''

      if (tableNameSplit.length === 1) {
        tableName = tableNameSplit[0]
      } else if (tableNameSplit.length === 2) {
        schema = tableNameSplit[0]
        tableName = tableNameSplit[1]
      }

      if (this.schemaTables.length > 1) {
        foundSchema = this.schemaTables.find(s => s.schema === schema)
      } else {
        foundSchema = this.schemaTables[0]
      }
      return foundSchema.tables.find(t => t.name === tableName)
    },
    importKey() {
      return `new-import-${this.stepperProps.tabId}`
    },
    tableKeyByMatrix({ schema: schemaName, name: tableName }){
      const schema = schemaName ? `${schemaName}==|==` : ''
      return `${schema}${tableName}`
    },
    async onFocus () {
      const importOptions = await this.tablesToImport.get(this.importKey())
      if (importOptions.importMap && this.importerId && this.tabulator) {
        this.tabulator.redraw()
      } else {
        this.initialize()
      }
    },
    async onNext() {
      const importOptions =  await this.tablesToImport.get(this.importKey())

      if (this.selectedTable) {
        importOptions.table = this.getTable()
        await this.$store.dispatch('updateTableColumns', importOptions.table)
        console.log(importOptions.table)
      } else {
        importOptions.table = null
      }
      
      const importData = {
        table: this.importKey(),
        importProcessId: this.importerId,
        importOptions
      }

      this.$store.commit('imports/upsertImport', importData)
    },
    async initialize () {
      const importOptions = await this.tablesToImport.get(this.importKey())

      // table might not exist based on the stuff, ya dig?
      this.selectedTable = this.tableKeyByMatrix(importOptions.table)
    },
  },
  mounted () {
    this.initialize()
  },
  unmounted() {
    if (this.tabulator) this.tabulator.destroy()
  },
  watch: {
    selectedTable () {
      this.createTableFromFile = !this.selectedTable
      this.$emit('change', Boolean(this.table) || this.createTableFromFile)
    }
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

  .table-switch {
    display: flex;
    justify-content: start;
    label {
      padding-right: 1rem;
    }
  }
</style>
