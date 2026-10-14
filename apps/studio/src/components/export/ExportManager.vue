<template>
  <div class="export-manager">
    <ExportModal
      v-if="table || query"
      :table="table"
      :query="query"
      :query-name="queryName"
      :filters="filters"
      @export="startExport"
      @closed="handleDeadModal"
    />
    <ExportNotification
      v-for="e in exports"
      :key="e.id"
      :export-id="e.id"
    />
  </div>
</template>
<script lang="ts">
import Vue from 'vue'
import Noty from 'noty'
import { mapGetters, mapMutations } from 'vuex'
import { AppEvent, RootBinding } from '../../common/AppEvent'
import { TableFilter, TableOrView } from '../../lib/db/models'
import ExportNotification from './ExportNotification.vue'
import ExportModal from './ExportModal.vue'
import { ExportProgress, ExportStatus, StartExportOptions } from '../../lib/export/models'
import { OpenInSpreadsheetOptions } from '../../lib/export/spreadsheet'

interface ExportTriggerOptions {
  table?: TableOrView,
  query?: string,
  queryName?: string,
  filters?: TableFilter[]
}

export default Vue.extend({
  components: { ExportModal, ExportNotification },
  props: [],
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
    ...mapGetters({ exports: "exports/exports" }),
    rootBindings(): RootBinding[] {
      return [
        { event: AppEvent.beginExport, handler: this.handleExportRequest },
        { event: AppEvent.openInSpreadsheet, handler: this.openInSpreadsheet },
      ]
    }
  },
  methods: {
    ...mapMutations({ addExport: "exports/addExport" }),
    async runExport(options: StartExportOptions): Promise<{ id: string, status: ExportStatus }> {
      const exp = await this.$util.send('export/add', {options});
      this.addExport(exp);
      await this.$util.send('export/start', { id: exp.id });
      const status = await this.$util.send('export/status', { id: exp.id });
      return { id: exp.id, status }
    },
    async startExport(options: StartExportOptions) {
      try {
        const exportName = options.table ? options.table.name : options.queryName;
        const { id, status } = await this.runExport(options)

        if (status == ExportStatus.Error) {
          const error = await this.$util.send('export/error', { id });
        // Error handling for export failure
        let errorMessage = "An unexpected error occurred during export.";
        const error_notice = this.$noty.error(`Export of ${exportName} failed: ${errorMessage}`, {
            buttons: [
              Noty.button('Close', "btn btn-primary", () => {
                error_notice.close()
              })
            ]
          }).setTimeout(this.$bksConfig.ui.export.errorNoticeTimeout)
          return
        }
        if (status !== ExportStatus.Completed) return;
        const n = this.$noty.success(`Export of ${exportName} complete`, {
          buttons: [
            Noty.button('Show', "btn btn-primary", () => {
              this.$native.files.showItemInFolder(options.filePath)
              n.close()
            })
          ]
        })
      } catch (e) {
        this.$noty.error(`Failed to export: ${e?.message || "Unexpected error"}`, {
        })
      }
    },
    async openInSpreadsheet(options: OpenInSpreadsheetOptions) {
      try {
        const filePath = await this.$native.files.newSpreadsheetPath(options.name)
        let truncated = false

        if (options.table) {
          const { id, status } = await this.runExport({
            table: options.table,
            filters: options.filters as any,
            filePath,
            exporter: 'xlsx',
            options: { chunkSize: 500, deleteOnAbort: true, includeFilter: true },
            outputOptions: {},
          })
          if (status === ExportStatus.Aborted) return
          if (status !== ExportStatus.Completed) {
            const error = await this.$util.send('export/error', { id })
            throw new Error(error?.message || 'Export failed')
          }
          truncated = await this.$util.send('export/truncated', { id })
        } else {
          const result = await this.$util.send('export/writeXlsx', {
            options: {
              filePath,
              sheetName: options.name,
              header: options.rows?.header ?? null,
              rows: options.rows?.rows ?? [],
            }
          })
          truncated = result.truncated
        }

        if (truncated) {
          this.$noty.warning('Too many rows for one Excel sheet, the extra rows were left out')
        }

        const error = await this.$native.files.openSpreadsheet(filePath)
        if (error) {
          const n = this.$noty.error(`Unable to open the spreadsheet: ${error}`, {
            buttons: [
              Noty.button('Show file', 'btn btn-primary', () => {
                this.$native.files.showItemInFolder(filePath)
                n.close()
              })
            ]
          })
        }
      } catch (e) {
        this.$noty.error(`Unable to open in Excel: ${e?.message || 'Unexpected error'}`)
      }
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