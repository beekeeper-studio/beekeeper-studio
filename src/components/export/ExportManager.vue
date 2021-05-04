<template>
  <div class="export-manager">
    <ExportModal
      v-for="options in pendingExports"
      :key="options.table.name"
      :connection="connection"
      :table="options.table"
      :filters="options.filters"
      @export="startExport"
      @closed="handleClosedModal"
    ></ExportModal>
    <ExportNotification 
    v-for="(value, key) in statuses"
    :key="key"
    :exporter="value"
    @cancel="handleCancel"
    ></ExportNotification>
  </div>
</template>
<script lang="ts">
import Vue from 'vue'
import Noty from 'noty'
import _ from 'lodash'
import { ModuleThread, spawn, Worker, Thread } from 'threads'
import { mapMutations, mapGetters } from 'vuex'
import { AppEvent, RootBinding } from '../../common/AppEvent'
import { DBConnection } from '../../lib/db/client'
import { TableFilter, TableOrView } from '../../lib/db/models'
import ExportNotification from './ExportNotification.vue'
import ExportModal from './ExportModal.vue'
import { ExportProgress } from '../../lib/export/models'
import { ExportWorker } from '../../workers/export_worker'
import connectionProvider from '../../lib/connection-provider'
import { ObservablePromise } from 'threads/dist/observable-promise'
import { uuidv4 } from '../../lib/uuid'


interface ExportTriggerOptions {
  table?: TableOrView,
  filters?: TableFilter[]
}


interface StartExportOptions {
  table: TableOrView,
  filters: TableFilter[]
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
      workers: new Map<string, ModuleThread<ExportWorker>>(),
      observers: new Map<string, ObservablePromise<ExportProgress>>(),
      statuses: new Map<string, ExportProgress>(),
      // these are for modals
      pendingExports: ([] as ExportTriggerOptions[]),
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
      const id = uuidv4()
      const worker = await spawn<ExportWorker>(new Worker('../../workers/export_worker'))
      const observer = worker.export({
        config: connectionProvider.convertConfig(this.$store.state.usedConfig, this.$store.state.username),
        database: this.$store.state.database,
        exportType: options.exporter,
        exportConfig: {
          filePath: options.filePath,
          table: options.table,
          filters: options.filters || [],
          options: options.options,
          outputOptions: options.outputOptions
        }
      })
      this.observers.set(id, observer)
      this.workers.set(id, worker)
      
      observer.subscribe(
        this.handleProgress.bind(this, id),
        this.handleError.bind(this, id),
        this.handleComplete.bind(this, id, options.filePath)
      )
    },
    handleExportRequest(options: ExportTriggerOptions): void {
      // this triggers the modal
      console.log('requested export', options)
      this.pendingExports.push(options)
    },
    handleProgress(id: string, progress: ExportProgress): void {
      this.statuses.set(id, progress)
    },
    async handleError(id: string, error: any) {
      const progress = this.statuses.get(id)
      const worker = this.workers.get(id)
      this.$noty.error(`Export failed ${progress?.tableName}: ${error}`)
      if (worker) await Thread.terminate(worker)
      this.statuses.delete(id)
      this.workers.delete(id)
      this.observers.delete(id)

    },

    async handleComplete(id: string, filePath: string) {
      const progress = this.statuses.get(id)
      const worker = this.workers.get(id)

      const n = this.$noty.success(`Export of ${progress?.tableName} complete`, {
        buttons: [
          Noty.button('Show', "btn btn-info", () => {
            this.$native.files.showItemInFolder(filePath)
            n.close()
          })
        ]
      })
      if (worker) await Thread.terminate(worker)
      this.statuses.delete(id)
      this.workers.delete(id)
      this.observers.delete(id)
    },
    handleCancel(id: string) {
      const worker = this.workers.get(id)
      if (!worker) return
      worker.cancel()
      this.$noty.info("Export cancelled")
    },
    handleClosedModal(options: ExportTriggerOptions) {
      this.pendingExports = _.without(this.pendingExports, options)
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