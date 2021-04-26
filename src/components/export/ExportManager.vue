<template>
  <div class="export-manager">
    <ExportModal
      v-if="table"
      :connection="connection"
      :table="table"
      :filters="filters"
      @closed="table = undefined"
    ></ExportModal>
    <ExportNotification v-for="exporter in exports" :key="exporter.id" :exporter="exporter"></ExportNotification>
  </div>
</template>
<script lang="ts">
import Vue from 'vue'
import { mapGetters } from 'vuex'
import { AppEvent, RootBinding } from '../../common/AppEvent'
import { DBConnection } from '../../lib/db/client'
import { TableFilter, TableOrView } from '../../lib/db/models'
import ExportNotification from './ExportNotification.vue'
import ExportModal from './ExportModal.vue'

interface ExportTriggerOptions {
  table?: TableOrView,
  filters?: TableFilter[]
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
    handleExportRequest(options?: ExportTriggerOptions): void {
      console.log('requested export', options)
      this.table = options?.table
      this.filters = options?.filters
    },
  },
  mounted() {
    this.registerHandlers(this.rootBindings)
  },
  beforeDestroy() {
    this.unregisterHandlers(this.rootBindings)
  }
})
</script>