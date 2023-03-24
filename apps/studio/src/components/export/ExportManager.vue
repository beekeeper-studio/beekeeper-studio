<template>
  <div class="export-manager">
    <ExportModal
      v-if="table || query"
      :connection="connection"
      :table="table"
      :query="query"
      :query_name="query_name"
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
import { ExportProgress, ExportStatus } from '../../lib/export/models'

interface ExportTriggerOptions {
  table?: TableOrView,
  query?: string,
  query_name?: string,
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
  query?: string,
  query_name?: string,
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
      query: '',
      query_name: '',
      filters: (undefined as TableFilter[] | undefined),
    }
  },
  computed: {
    ...mapGetters({ 'exports': 'exports/runningExports' }),
    rootBindings(): RootBinding[] {
      return [
        { event: AppEvent.beginExport, handler: this.handleExportRequest },
      ]
    }
  },
  methods: {
    ...mapMutations({ addExport: "exports/addExport" }),
    async startExport(options: StartExportOptions) {
      // FIXME: try/catch and notify users if an error occurs.
      // FIXME: Make sure we only send a single query to the exporter
      const exporter = new ExportClassPicker[options.exporter](
        options.filePath,
        this.connection,
        options.table,
        options.query,
        options.query_name,
        options.filters || [],
        options.options,
        options.outputOptions
      )
      this.addExport(exporter)
      exporter.onProgress(this.notifyProgress.bind(this))
      // FIXME: We need an exporter.onError event probably to handle errors during export
      await exporter.exportToFile()
      if (exporter.status !== ExportStatus.Completed) return;
      const exportName = options.table? options.table.name : 'query';
      const n = this.$noty.success(`Export of ${exportName} complete`, {
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
      this.query = options?.query
      this.query_name = options?.query_name
      this.filters = options?.filters
    },
    handleDeadModal() {
      this.table = undefined
      this.filters = undefined
      this.query = undefined
      this.query_name = undefined
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
