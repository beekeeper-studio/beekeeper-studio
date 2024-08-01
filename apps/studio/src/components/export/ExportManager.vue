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
    <!-- TODO (@day): the exports will just be an array of ids -->
    <ExportNotification
      v-for="exportId in exports"
      :key="exportId"
      :exportId="exportId"
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
import globals from '@/common/globals'

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
      const id = await this.$util.send('export/add', {options});
      this.addExport(id);

      const exportName = options.table ? options.table.name : options.queryName;

      await this.$util.send('export/start', {id});
      const status = await this.$util.send('export/status', {id});

      if (status == ExportStatus.Error) {
        const error = this.$util.send('export/error', {id});
        const error_notice = this.$noty.error(`Export of ${exportName} failed: ${error}`, {
          buttons: [
            Noty.button('Close', "btn btn-primary", () => {
              error_notice.close()
            })
          ]
        }).setTimeout(globals.errorNoticeTimeout)
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
