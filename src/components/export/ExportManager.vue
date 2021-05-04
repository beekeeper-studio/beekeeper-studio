<template>
  <div class="export-manager">
    <ExportModal
      v-if="table"
      :connection="connection"
      :table="table"
      :filters="filters"
      @export="startExport"
    ></ExportModal>
    <ExportNotification v-for="exporter in exports" :key="exporter.id" :exporter="exporter"></ExportNotification>
  </div>
</template>
<script lang="ts">
import Vue from 'vue'
import Noty from 'noty'
import { spawn, Worker } from 'threads'
import { mapMutations, mapGetters } from 'vuex'
import { AppEvent, RootBinding } from '../../common/AppEvent'
import { DBConnection } from '../../lib/db/client'
import { TableFilter, TableOrView } from '../../lib/db/models'
import ExportNotification from './ExportNotification.vue'
import ExportModal from './ExportModal.vue'
import { Exporter} from '../../lib/export'
import { ExportProgress } from '../../lib/export/models'
import { ExportWorker } from '../../workers/export_worker'
import connectionProvider from '../../lib/connection-provider'


interface ExportTriggerOptions {
  table?: TableOrView,
  filters?: TableFilter[]
}


interface StartExportOptions {
  exporter: 'csv' | 'json' | 'sql'
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
      if (!this.table) return
      const worker = await spawn<ExportWorker>(new Worker('../../workers/export_worker'))
      const observer = worker.export({
        config: connectionProvider.convertConfig(this.$store.state.usedConfig, this.$store.state.username),
        database: this.$store.state.database,
        exportType: options.exporter,
        exportConfig: {
          filePath: options.filePath,
          table: this.table,
          filters: this.filters || [],
          options: options.options,
          outputOptions: options.outputOptions
        }
      })

      if (this.table) {
        const exporter = new (Exporter(options.exporter))(
          options.filePath,
          this.connection,
          this.table,
          this.filters || [],
          options.options,
          options.outputOptions
        )
        this.addExport(exporter)
        exporter.onProgress(this.notifyProgress.bind(this))
        await exporter.exportToFile()
        console.log("complete!")
        const n = this.$noty.success(`Export of ${this.table.name} complete`, {
          buttons: [
            Noty.button('Show', "btn btn-info", () => {
              this.$native.files.showItemInFolder(options.filePath)
              n.close()
            })
          ]
        })
        this.table = undefined
      }
    },
    handleExportRequest(options?: ExportTriggerOptions): void {
      console.log('requested export', options)
      this.table = options?.table
      this.filters = options?.filters
    },
    notifyProgress(progress: ExportProgress) {
      console.log(progress)
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