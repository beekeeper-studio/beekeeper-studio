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
      :exportId="e.id"
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
      ]
    }
  },
  methods: {
    ...mapMutations({ addExport: "exports/addExport" }),
    async startExport(options: StartExportOptions) {
      try {
        const exp = await this.$util.send('export/add', {options});
        this.addExport(exp);

        const exportName = options.table ? options.table.name : options.queryName;

        await this.$util.send('export/start', { id: exp.id });
        const status = await this.$util.send('export/status', { id: exp.id });

        if (status == ExportStatus.Error) {
          const error = await this.$util.send('export/error', { id: exp.id });
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