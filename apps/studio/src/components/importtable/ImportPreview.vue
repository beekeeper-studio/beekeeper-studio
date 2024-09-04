<template>
  <section class="import-table-wrapper">
    <div class="import-section-wrapper preview-stats">
      <div class="card-flat padding">
        <h3>Table</h3>
        <p>{{ tableName }}</p>
      </div>
      <div class="card-flat padding">
        <h3>Columns Mapped:</h3>
        <p>{{ columnsImportedCount }}</p>
      </div>
      <div class="card-flat padding">
        <h3>Columns Ignored</h3>
        <p>{{ columnsIgnoredCount }}</p>
      </div>
    </div>
    <div ref="tabulator" />
  </section>
</template>

<script>
import { mapGetters, mapState } from 'vuex'
import { format } from 'sql-formatter'
import { Tabulator, TabulatorFull } from 'tabulator-tables'
import Mutators from '../../mixins/data_mutators'
import { AppEvent } from '@/common/AppEvent'
import { FormatterDialect } from '@shared/lib/dialects/models'
import { getImporterClass } from '../../lib/import/utils'

export default {
  components: {
  },
  mixins: [Mutators],
  props: {
    stepperProps: {
      type: Object,
      required: true,
      default: () => ({
        schema: '',
        table: '',
        connection: {},
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
    ...mapGetters(['dialect']),
    ...mapState(['connection']),
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
      const schema = this.stepperProps.schema ? `${this.stepperProps.schema}.` : ''
      return `${schema}${this.stepperProps.table}`
    }
  },
  methods: {
    tableKey() {
      const schema = this.stepperProps.schema ? `${this.stepperProps.schema}_` : ''
      return `${schema}${this.stepperProps.table}`
    },
    async tableData() {
      const { data } = await this.importerClass.getPreview()
      return this.importerClass.mapData(data)
    },
    async initTabulator() {
      if (this.tabulator) return this.tabulator.redraw(true)

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
      if (this.importerClass && this.tabulator) {
        this.tabulator.redraw()
      }
    },
    async initialize () {
      const importOptions = await this.tablesToImport.get(this.tableKey())
      const connection = await this.connection
      this.table = importOptions.table
      this.importOptions = importOptions
      this.importerClass = getImporterClass(this.importOptions, connection, this.table)
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
.preview-stats {
  display: flex;
  justify-content: space-between;
  margin-bottom: 2rem;
  > div {
    width: 30%;
     > h3 {
      margin: 0 0 .5rem 0;
      overflow-wrap: break-word;
    }
    > p {
      margin: 0;
      overflow-wrap: break-word;
     }
  }
}
</style>