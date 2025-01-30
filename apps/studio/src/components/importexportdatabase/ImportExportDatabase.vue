<template>
  <div
    v-if="isCommunity"
    class="tab-upsell-wrapper"
  >
    <upsell-content />
  </div>
  <div v-else class="import-export__wrapper tabcontent">
    <div class="import-export__container">
      <stepper
        :steps="exportSteps"
        @finished="startExport"
        :button-portal-target="portalName"
      />
    </div>
    <status-bar class="import-export__footer">
      <div class="statusbar-info col flex expand">
        <span
          class="statusbar-item"
          :title="`Selected Tables ${selectedTables}`"
        >
          <i class="material-icons">backup_table</i>
          <span>{{ selectedTables }}</span>
        </span>
      </div>
      <portal-target
        class="portal-stepper-buttons"
        :name="portalName"
      />
    </status-bar>
    <modal
      class="vue-dialog beekeeper-modal relative job-status success"
      :name="`success-modal-${tab.id}`"
      @opened="focusCloseTab"
    >
      <div class="dialog-content">
        <div class="outer-circle">
          <div class="inner-circle">
            <i class="material-icons">check</i>
          </div>
        </div>
        <div>All Tables Have Been Successfully Exported</div>
        <button
          ref="closeTab"
          @click="showFiles"
          class="btn btn-primary primary-action"
        >
          Show Files
        </button>
        <button
          @click="$modal.hide(`success-modal-${tab.id}`)"
          class="close-modal"
        >
          <i class="material-icons">close</i>
        </button>
      </div>
    </modal>
    <modal
      class="vue-dialog beekeeper-modal relative job-status fail"
      :name="`fail-modal-${tab.id}`"
      @opened="focusTryAgain"
    >
      <div class="dialog-content">
        <div class="outer-circle">
          <div class="inner-circle">
            !
          </div>
        </div>
        <div>Batch Export Failed.</div>
        <button
          ref="tryAgain"
          @click="retryFailedExports"
          class="btn btn-primary primary-action"
        >
          Retry Failed Exports
        </button>
        <button
          @click="$modal.hide(`fail-modal-${tab.id}`)"
          class="close-modal"
        >
          <i class="material-icons">close</i>
        </button>
      </div>
    </modal>
  </div>
</template>

<script>
  import { mapGetters, mapState, mapMutations } from 'vuex'
  import Stepper from '../stepper/Stepper.vue'
  import ExportObjects from './ExportObjects.vue'
  import ExportOptions from './ExportOptions.vue'
  import ExportConfirmation from './ExportConfirmation.vue'
  import UpsellContent from '@/components/upsell/UpsellContent.vue'

  import { ExportStatus } from '../../lib/export/models'
  import StatusBar from '@/components/common/StatusBar.vue';

  export default {
    components: {
      Stepper,
      StatusBar,
      UpsellContent
    },
    props: ['schema', 'tab'],
    data() {
      return {
        exportSteps: [
          {
            component: ExportObjects,
            title: 'Select Tables',
            icon: 'data_object',
            stepperProps: {},
            completed: true,
            completePrevious: false,
            nextButtonText: 'Configure Export',
            nextButtonIcon: 'arrow_forward',
            nextButtonDisabledTooltip: 'You must select at least 1 table to continue.'
          },
          {
            component: ExportOptions,
            title: 'Configure Export',
            icon: 'settings',
            stepperProps: {},
            completed: false,
            completePrevious: true,
            nextButtonText: 'Review & Execute',
            nextButtonIcon: 'arrow_forward',
            nextButtonDisabledTooltip: 'Please ensure that all required fields are filled out.',
            allowScroll: true
          },
          {
            component: ExportConfirmation,
            title: 'Review & Execute',
            icon: 'check',
            stepperProps: {
              exportsStarted: false,
              successModalName: `success-modal-${this.tab.id}`,
              failModalName: `fail-modal-${this.tab.id}`
            },
            completed: false,
            completePrevious: true,
            nextButtonText: 'Run Export',
            allowScroll: true
          }
        ]
      }
    },
    computed: {
      ...mapGetters('multiTableExports', ['isSelectTableComplete', 'isOptionsComplete']),
      ...mapState(['connection']),
      ...mapState('multiTableExports', ['tablesToExport', 'tableOptions', 'exportSchema']),
      ...mapGetters({
        'hasRunningExports': 'exports/hasRunningExports',
        'isCommunity': 'isCommunity',
      }),
      selectedTables() {
        return this.tablesToExport.length;
      },
      portalName() {
        return `tab-export-table-statusbar-${this.tab.id}`
      },
      listTables() {
        return Array.from(this.tablesToExport).map((table) => {
          const schema = table.schema ? `${table.schema}_` : ''
          const options = this.tableOptions.fileNameOptions ? `_${this.tableOptions.fileNameOptions}` : ''
          return {
            name: `${schema}${table.name}${options}.${this.tableOptions.exporter}`,
            table
          }
        })
      },
      exportsAllDone() {
        return !this.hasRunningExports && this.exportSteps[2].stepperProps.exportsStarted;
      }
    },
    watch: {
      exportsAllDone() {
        if (this.exportsAllDone) {
          this.tab.isRunning = false;
        }
      }
    },
    methods: {
      ...mapMutations({ addExportToStore: 'exports/addExport' }),
      showFiles() {
        this.$native.files.open(this.tableOptions.filePath)
      },
      async startExport() {
        this.tab.isRunning = true;
        const exporters = await Promise.all(this.listTables.map(async (exportTable) => {
          await this.$store.dispatch('updateTableColumns', exportTable.table)
          const exporterId = await this.addExport(exportTable)
          this.$util.addListener(`onExportProgress/${exporterId}`, (progress) => {
            this.$store.commit('exports/updateProgressFor', { id: exporterId, progress });
          })
          return exporterId;
        }))

        this.exportSteps[2].stepperProps.exportsStarted = true
        this.$util.send('export/batch', { ids: exporters }).then(() => {
          this.tab.isRunning = false;

          exporters.forEach((id) => {
            this.$util.removeListener(`onExportProgress/${id}`);
          })
        });
      },
      async addExport(tableToExport) {
        const tableOptions = this.tableOptions;
        const exporter = await this.$util.send('export/add', {
          options: {
            filePath: `${tableOptions.filePath}/${tableToExport.name}`,
            table: tableToExport.table,
            query: '',
            queryName: '',
            filters: tableOptions.filters || [],
            options: tableOptions.options,
            outputOptions: tableOptions.outputOptions,
            managerNotify: false,
            exporter: tableOptions.exporter
          }
        })
        this.addExportToStore(exporter);
        return exporter.id;
      },
      close() {
        this.$emit('close', this.tab);
      },
      focusCloseTab() {
        if (!this.$refs['closeTab'] || this.$refs['closeTab'].length === 0) return;
        this.$refs['closeTab'].focus();
      },
      focusTryAgain() {
        if (!this.$refs['tryAgain'] || this.$refs['tryAgain'].length === 0) return;
        this.$refs['tryAgain'].focus();
      },
      async retryFailedExports() {
        await this.$store.dispatch('exports/retryFailedExports');
      },
    },
    async mounted() {
      await this.$store.dispatch('multiTableExports/reset')
      await this.$store.dispatch('exports/removeInactive')
    }
  }
</script>

<style lang="scss" scoped>
  .content {
    overflow-y: scroll;
  }
</style>
