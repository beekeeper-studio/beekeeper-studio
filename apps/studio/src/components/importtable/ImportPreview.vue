<template>
  <section class="import-table-wrapper">
    <div class="import-section-wrapper">
      <div class="card-flat padding">
        <h3>Table</h3>
        <p>{{ tableName }}</p>
      </div>
      <div class="preview-column-stats">
        <div class="card-flat padding">
          <h3>Columns Mapped</h3>
          <p>{{ columnsImportedCount }}</p>
        </div>
        <div class="card-flat padding" v-if="!importOptions?.createNewTable">
          <h3>Columns Ignored</h3>
          <p>{{ columnsIgnoredCount }}</p>
        </div>
      </div>
    </div>
    <div ref="tabulator" />
  </section>
</template>

<script>
import { mapGetters, mapState } from 'vuex'
import { Tabulator, TabulatorFull } from 'tabulator-tables'
import Mutators from '../../mixins/data_mutators'
import { AppEvent } from '@/common/AppEvent'
import { FormatterDialect } from '@shared/lib/dialects/models'

export default {
  components: {
  },
  mixins: [Mutators],
  props: {
    stepperProps: {
      type: Object,
      required: true,
      default: () => ({
        tabId: null,
        importStarted: false,
        timer: null,
        importError: null
      })
    },
  },
  data() {
    return {
      table: null,
      importOptions: null,
      importerClass: null,
      previewData: null,
      sql: ''
    }
  },
  computed: {
    ...mapState('imports', {'tablesToImport': 'tablesToImport'}),
    ...mapGetters(['schemaTables', 'dialect']),
    importColumns () {
      return this.importOptions.importMap.map(m => ({
        title: m.tableColumn,
        field: m.tableColumn,
        formatter: this.cellFormatter
      }))
    },
    columnsImportedCount () {
      return this.importOptions?.importMap?.length ?? '-'
    },
    columnsIgnoredCount () {
      const totalColumns = this.table?.columns?.length ?? 0
      const mappedColumns = this.importOptions?.importMap?.length ?? 0
      return totalColumns - mappedColumns
    },
    tableName () {
      const schema = this.table?.schema ? `${this.table?.schema}.` : ''
      return `${schema}${this.table?.name}`
    }
  },
  methods: {
    importKey() {
      return `new-import-${this.stepperProps.tabId}`
    },
    getTable({schema, name: tableName}) {
      let foundSchema = ''
      if (this.schemaTables.length > 1) {
        foundSchema = this.schemaTables.find(s => s.schema === schema)
      } else {
        foundSchema = this.schemaTables[0]
      }
      return foundSchema.tables.find(t => t.name === tableName)
    },
    async tableData() {
      return await this.$util.send('import/getImportPreview', { id: this.importerClass })
    },

    async initTabulator() {
      if (this.tabulator) this.tabulator.destroy()

      this.tabulator = new TabulatorFull(this.$refs.tabulator, {
        data: await this.tableData(),
        columns: this.importColumns,
        renderHorizontal: 'virtual',
        placeholder: 'No Data',
        columnDefaults: {
          resizable: false,
          headerSort: false,
          editable: false
        }
      })
    },
    async onFocus () {
      const importOptions = await this.tablesToImport.get(this.importKey())
      this.table = importOptions.table

      if (!importOptions.createNewTable) {
        await this.$store.dispatch('updateTableColumns', this.getTable(importOptions.table))
        this.table = this.getTable(importOptions.table)
      }

      if (Boolean(this.importerClass) && Boolean(this.tabulator)) {
        this.initTabulator()
      } else {
        this.initialize()
      }
    },
    async initialize () {
      const importOptions = await this.tablesToImport.get(this.importKey())
      if (!importOptions.createNewTable) {
        await this.$store.dispatch('updateTableColumns', this.getTable(importOptions.table))
        this.table = this.getTable(importOptions.table)
      } else {
        this.table = importOptions.table
      }
      this.importOptions = importOptions
      if (!importOptions.importProcessId) {
        this.importerClass = await this.$util.send('import/init', { options: importOptions })
      } else {
        this.importerClass = importOptions.importProcessId
      }
      this.initTabulator()
    }
  },
  mounted() {
    this.initialize()  
  },
  unmounted() {
    if (this.tabulator) this.tabulator.destroy()
  }
}
</script>

<style lang="scss" scoped>
.preview-column-stats {
  display: flex;
  justify-content: space-between;
  margin-top: 2rem;
  margin-bottom: 2rem;
  > div {
    width: 30%;
     > h3 {
      margin: 0 0 .5rem 0;
    }
    > p {
      margin: 0;
     }
  }
}
</style>
