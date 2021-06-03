<template>
  <div class="export-manager">
    <ExportModal
      v-if="table"
      :connection="connection"
      :table="table"
      :filters="filters"
      @export="startExport"
      @closed="handleDeadModal"
    ></ExportModal>
    <ExportNotification v-for="exporter in exports" :key="exporter.id" :exporter="exporter"></ExportNotification>
  </div>
</template>
<script lang="ts">
import Vue from 'vue'
import Noty from 'noty'
import { mapMutations, mapGetters } from 'vuex'
import { AppEvent, RootBinding } from '../../common/AppEvent'
import { DBConnection } from '../../lib/db/client'
import { TableFilter, TableOrView } from '../../lib/db/models'
import ExportNotification from './ExportNotification.vue'
import ExportModal from './ExportModal.vue'
import { CsvExporter, JsonExporter, JsonLineExporter, SqlExporter } from '../../lib/export'
import { ExportProgress } from '../../lib/export/models'

interface ExportTriggerOptions {
  table?: TableOrView,
  filters?: TableFilter[]
}


const ExportClassPicker = {
  'csv': CsvExporter,
  'json': JsonExporter,
  'sql': SqlExporter,
  'jsonl': JsonLineExporter
}

interface StartExportOptions {
  table: TableOrView,
  filters: TableFilter[],
  exporter: 'csv' | 'json' | 'sql' | 'jsonl'
  filePath: string
  options: {
    chunkSize: number
    deleteOnAbort: boolean
    includeFilter: boolean
  }
  outputOptions: any
}


export default Vue.extend({
  components: { ExportModal, ExportNotification },
  props: {
    connection: DBConnection
  },
  data() {
    return {
      // these are like 'pending Export'
      table: (undefined as TableOrView | undefined),
      filters: (undefined as TableFilter[] | undefined),
    }
  },
  computed: {
    ...mapGetters({ 'exports': 'exports/runningExports' }),
    rootBindings(): RootBinding[] {
      return [
        { event: AppEvent.beginExport, handler: this.handleExportRequest }
      ]
    }
  },
  methods: {
    ...mapMutations({ addExport: "exports/addExport" }),
    async startExport(options: StartExportOptions) {
        const exporter = new ExportClassPicker[options.exporter](
          options.filePath,
          this.connection,
          options.table,
          options.filters || [],
          options.options,
          options.outputOptions
        )
        this.addExport(exporter)
        exporter.onProgress(this.notifyProgress.bind(this))
        await exporter.exportToFile()
        console.log("complete!")
        const n = this.$noty.success(`Export of ${options.table.name} complete`, {
          buttons: [
            Noty.button('Show', "btn btn-primary", () => {
              this.$native.files.showItemInFolder(options.filePath)
              n.close()
            })
          ]
        })
    },
    handleExportRequest(options?: ExportTriggerOptions): void {
      this.table = options?.table
      this.filters = options?.filters
    },
    handleDeadModal() {
      this.table = undefined
      this.filters = undefined
    },
    notifyProgress(_progress: ExportProgress) {
    }
  },
  mounted() {
    this.registerHandlers(this.rootBindings)
  },
  beforeDestroy() {
    this.unregisterHandlers(this.rootBindings)
  }
})
</script>