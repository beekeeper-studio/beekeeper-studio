<template>
  <div class="export-manager">
    <ExportModal
      v-if="table || query"
      :connection="connection"
      :table="table"
      :query="query"
      :query-name="queryName"
      :filters="filters"
      @export="startExport"
      @closed="handleDeadModal"
    />
    <ExportNotification
      v-for="exporter in exports"
      :key="exporter.id"
      :exporter="exporter"
    />
  </div>
</template>
<script lang="ts">
import Vue from 'vue'
import Noty from 'noty'
import { mapMutations, mapGetters } from 'vuex'
import { AppEvent, RootBinding } from '../../common/AppEvent'
import { TableFilter, TableOrView } from '../../lib/db/models'
import ExportNotification from './ExportNotification.vue'
import ExportModal from './ExportModal.vue'
import { CsvExporter, JsonExporter, JsonLineExporter, SqlExporter } from '../../lib/export'
import { ExportProgress, ExportStatus } from '../../lib/export/models'
import globals from '@/common/globals'

interface ExportTriggerOptions {
  table?: TableOrView,
  query?: string,
  queryName?: string,
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
  queryName?: string,
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
  props: ['connection'],
  data() {
    return {
      // these are like 'pending Export'
      table: (undefined as TableOrView | undefined),
      query: '',
      queryName: '',
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
      const exporter = new ExportClassPicker[options.exporter](
        options.filePath,
        this.connection,
        options.table,
        options.query,
        options.queryName,
        options.filters || [],
        options.options,
        options.outputOptions
      )
      this.addExport(exporter)
      exporter.onProgress(this.notifyProgress.bind(this))

      const exportName = options.table ? options.table.name : options.queryName;

      await exporter.exportToFile()

      if (exporter.status == ExportStatus.Error) {
        const exportName = options.table ? options.table.name : options.queryName;
        const error_notice = this.$noty.error(`Export of ${exportName} failed: ${exporter.error}`, {
          buttons: [
            Noty.button('Close', "btn btn-primary", () => {
              error_notice.close()
            })
          ]
        }).setTimeout(globals.errorNoticeTimeout)
        return
      }
      if (exporter.status !== ExportStatus.Completed) return;
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
      this.queryName = options?.queryName
      this.filters = options?.filters
    },
    handleDeadModal() {
      this.table = undefined
      this.filters = undefined
      this.query = undefined
      this.queryName = undefined
    },
    notifyProgress(_progress: ExportProgress) {
      // Empty on purpose
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
