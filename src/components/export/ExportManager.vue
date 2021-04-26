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
import { mapGetters, mapMutations } from 'vuex'
import { AppEvent, RootBinding } from '../../common/AppEvent'
import { DBConnection } from '../../lib/db/client'
import { TableFilter, TableOrView } from '../../lib/db/models'
import ExportNotification from './ExportNotification.vue'
import ExportModal from './ExportModal.vue'
import { CsvExporter, JsonExporter, SqlExporter } from '../../lib/export'

interface ExportTriggerOptions {
  table?: TableOrView,
  filters?: TableFilter[]
}


const ExportClassPicker = {
  'csv': CsvExporter,
  'json': JsonExporter,
  'sql': SqlExporter
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
      table: (undefined as TableOrView | undefined),
      filters: (undefined as TableFilter[] | undefined),
    }
  },
  computed: {
    ...mapGetters({ 'exports': 'exports/runningVisibleExports' }),
    rootBindings(): RootBinding[] {
      return [
        { event: AppEvent.beginExport, handler: this.handleExportRequest }
      ]
    }
  },
  methods: {
    ...mapMutations({ addExport: "exports/addExport" }),
    async startExport(options: StartExportOptions) {
      if (this.table) {
        const exporter = new ExportClassPicker[options.exporter](
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
        this.$noty.success(`Export of ${this.table.name} complete`)
      }
    },
    handleExportRequest(options?: ExportTriggerOptions): void {
      console.log('requested export', options)
      this.table = options?.table
      this.filters = options?.filters
    },
    notifyProgress() {

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