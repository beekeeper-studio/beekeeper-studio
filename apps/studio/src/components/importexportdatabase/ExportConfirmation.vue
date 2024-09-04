<template>
  <div class="import-export-wrapper">
    <div class="top-content row">
      <div class="col">
        <div class="card card-flat padding text-center">
          <div v-if="exportsAllDone">
            <p class="verify">
              All Export processes completed
            </p>
            <button
              class="btn btn-primary"
              @click="showFiles"
              type="button"
              v-if="exportsAllDone"
            >
              Show Files
            </button>
          </div>
          <div v-else-if="hasRunningExports">
            <p class="verify">
              Running exports...
            </p>
          </div>
          <div v-else>
            <p class="verify">
              Ready to export {{ listTables.length }} tables
            </p>
            <a
              v-if="!stepperProps.exportsStarted"
              @click.prevent="$emit('finish')"
              class="btn btn-primary"
            >
              Run Export
            </a>
          </div>
        </div>
      </div>
    </div>
    <div class="row">
      <div class="col">
        <ul class="file-list">
          <li
            v-for="(table, index) in this.listTables"
            :key="index"
          >
            <export-status
              :table="table"
              :export="getTableExport(table)"
              :exports-started="stepperProps.exportsStarted"
              @retry="retryExportForTable"
            />
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
  import _ from 'lodash'
  import { mapGetters, mapState } from 'vuex'
  import { AppEvent } from '@/common/AppEvent'
  import ExportStatus from './ExportStatus.vue'
  import Vue from 'vue';
import { TransportExport } from '@/common/transport/TransportExport';

  export default Vue.extend({
    components: { ExportStatus },
    props: ['stepperProps'],
    data() {
      return {
        modalShown: false
      }
    },
    computed: {
      ...mapState('multiTableExports', ['tablesToExport', 'tableOptions']),
      ...mapState('exports', ['exports']),
      ...mapGetters({'hasRunningExports': 'exports/hasRunningExports'}),
      ...mapGetters('multiTableExports', ['isSelectTableComplete', 'isOptionsComplete']),
      listTables() {
        return Array.from(this.tablesToExport).map((table: any) => {
          const options = this.tableOptions.fileNameOptions ? `_${this.tableOptions.fileNameOptions}` : ''
          const schema = table.schema ? `${table.schema}_` : ''
          return {
            name: `${schema}${table.name}${options}.${this.tableOptions.exporter}`,
            table
          }
        })
      },
      exportsAllDone() {
        return !this.hasRunningExports && this.stepperProps.exportsStarted
      },
    },
    watch: {
      exportsAllDone() {
        if (this.exportsAllDone && !this.modalShown) {
          this.modalShown = true;
          if (this.exports.some((e) => e.status === 'aborted' || e.status === 'error')) {
            this.$modal.show(this.stepperProps.failModalName)
          } else {
            this.$modal.show(this.stepperProps.successModalName)
          }
        }
      }
    },
    methods: {
      showFiles() {
        this.$native.files.open(this.tableOptions.filePath)
      },
      getTableExport(table): TransportExport {
        const exportFile = `${this.tableOptions.filePath}/${table.name}`;
        const [exported] = this.exports.filter(f => f.filePath === exportFile);
        return exported;
      },
      async retryExportForTable(table) {
        const tableExport: string = this.getTableExport(table);
        await this.$store.dispatch('exports/retryExportForTable', tableExport);
      },
      handleCloseTab () {
        this.$root.$emit(AppEvent.closeTab)
      },
      async canContinue() {
        return await this.isSelectTableComplete && this.isOptionsComplete
      }
    }
  })
</script>
