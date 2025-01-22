<template>
  <div
    v-if="!isSupported"
    class="tab-content"
  >
    <div class="not-supported">
      <p>
        Beekeeper does not currently support Import from File for {{ this.dialectTitle }} ☹️
      </p>
    </div>
  </div>
  <div
    v-else-if="isCommunity"
    class="tab-upsell-wrapper"
  >
    <upsell-content />
  </div>
  <div v-else class="tab-content">
    <div class="import-table-container">
      <stepper
        :steps="importSteps"
        :button-portal-target="portalName"
        wrapper-class="import-export-wrapper"
        @finished="handleImport"
        v-show="!this.importStarted"
      />
      <div
        class="import-table-wrapper import-progress"
        v-if="importStarted"
      >
        <div class="import-progress-wrapper flex-col">
          <i :class="[{error: this.importError !== null, spinning: isSpinning}, 'material-icons loading-icon']">
            {{ getProgressIcon }}
          </i>
          <div class="text-2x">
            {{ getProgressTitle }}
          </div>
        </div>
        <div
          v-if="this.timer !== null && this.importError === null"
          class="import-cta-button-wrapper"
        >
          <button
            type="button"
            @click.prevent="closeTab"
            class="btn btn-flat close-tab-btn"
          >
            Close Tab
          </button>
          <button
            type="button"
            @click.prevent="viewData"
            class="btn btn-primary"
          >
            View Data in {{ tableName }}
          </button>
        </div>
        <div v-else-if="this.importError">
          <p>The whole import was aborted with a transaction rollback</p>
          <div>
            <p class="import-error-message">
              {{ importError }}
            </p>
            <span class="buttons">
              <a
                @click.prevent="goBack"
                class="btn btn-primary btn-icon"
              >
                <i class="material-icons">chevron_left</i>
                <span>Try Again</span>
              </a>
              <a
                v-clipboard:copy="importError"
                v-clipboard:success="onCopySuccess"
                v-clipboard:error="onCopyError"
                class="btn btn-icon"
                :class="copyClass"
              >
                <span
                  class="material-icons"
                  :title="copyTitle"
                >
                  {{ copyIcon }}
                </span>
                {{ copyMessage }}
              </a>
            </span>
          </div>
        </div>
      </div>
    </div>

    <status-bar>
      <div class="statusbar-info col flex expand">
        <span
          class="statusbar-item"
          :title="`Included Tables ${tableKey}`"
        >
          <i class="material-icons">backup_table</i>
          <span>{{ tableKey }}</span>
        </span>
      </div>
      <portal-target
        class="portal-stepper-buttons"
        :name="portalName"
      />
    </status-bar>
  </div>
</template>

<script>
  import { mapGetters, mapState, mapMutations } from 'vuex'
  import { AppEvent } from '@/common/AppEvent'
  import Stepper from './stepper/Stepper.vue'
  import ImportFile from './importtable/ImportFile.vue'
  import ImportMapper from './importtable/ImportMapper.vue'
  import ImportPreview from './importtable/ImportPreview.vue'
  import UpsellContent from '@/components/upsell/UpsellContent.vue'
  import { DialectTitles } from '@shared/lib/dialects/models'

  import { ExportStatus } from '../lib/export/models'
  import StatusBar from '@/components/common/StatusBar.vue';

  export default {
    components: {
      Stepper,
      StatusBar,
      UpsellContent
    },
    props: {
      schema: {
        type: String,
        required: false,
        default: ''
      },
      table: {
        type: String,
        required: true,
        default: ''
      },
      tab: {
        type: Object,
        required: true
      }
    },
    data() {
      return {
        importTable: null,
        copyMessage: "Copy",
        copyIcon: "content_copy",
        copyClass: 'btn-flat copy-btn',
        copyTitle: null,
        importError: null,
        timer: null,
        importStarted: false,
        importSteps: [
          {
            component: ImportFile,
            title: 'Choose File',
            icon: 'attach_file',
            stepperProps: {
              schema: this.schema,
              table: this.table
            },
            completed: false,
            completePrevious: false,
            nextButtonText: 'Map to Table',
            nextButtonIcon: 'keyboard_arrow_right'
          },
          {
            component: ImportMapper,
            title: 'Map to Table',
            icon: 'settings',
            stepperProps: {
              schema: this.schema,
              table: this.table
            },
            completed: false,
            validateOnNext: true,
            completePrevious: true,
            nextButtonText: 'Review & Execute',
            nextButtonIcon: 'keyboard_arrow_right'
          },
          {
            component: ImportPreview,
            title: 'Review & Execute',
            icon: 'check',
            stepperProps: {
              schema: this.schema,
              table: this.table
            },
            completed: false,
            completePrevious: true,
            nextButtonText: 'Run The Import',
            nextButtonIcon: 'keyboard_arrow_right'
          }
        ]
      }
    },
    computed: {
      ...mapGetters(['schemaTables', 'dialectData', 'dialect', 'isCommunity', 'isUltimate']),
      ...mapState(['tables', 'connection']),
      ...mapState('imports', {'tablesToImport': 'tablesToImport'}),
      isSpinning() {
        return this.importStarted && this.importError === null && this.timer === null;
      },
      portalName() {
        return `tab-import-table-statusbar-${this.tab.id}`
      },
      tableName () {
        const schema = this.schema ? `${this.schema}.` : ''
        return `${schema}${this.table}`
      },
      dialectTitle () {
        return DialectTitles[this.dialect]
      },
      isSupported () {
        return !this.dialectData.disabledFeatures.importFromFile
      },
      tableKey() {
        const schema = this.schema ? `${this.schema}_` : ''
        return `${schema}${this.table}`
      },
      getProgressTitle () {
        if (this.importStarted && this.importError === null && this.timer === null) {
          return 'Importing...'
        }
        return this.importError !== null ? 'Import Failed' : `Import Successful: ${this.timer}`
      },
      getProgressIcon () {
        if (this.importStarted && this.importError === null && this.timer === null) {
          return 'autorenew'
        }
        return this.importError !== null ? 'error' : 'check_circle'
      },
    },
    methods: {
      onCopySuccess() {
        this.copyMessage = "Copied"
        this.copyIcon = "done"
        this.copyClass = "btn-success copy-btn"
        setTimeout(() => {
          this.copyMessage = "Copy to Clipboard"
          this.copyIcon = "content_copy"
          this.copyClass = "btn-flat copy-btn"
        }, 2000)
      },
      onCopyError(e) {
        this.copyMessage = "Error"
        this.copyTitle = e.message
        this.copyIcon = "error"
        this.copyClass = "btn-error"
        setTimeout(() => {
          this.copyMessage = "Copy Error To Clipboard"
          this.copyIcon = "content_copy"
          this.copyClass = "btn-flat copy-btn"
        }, 5000);
      },
      getTable() {
        return this.tab.findTable(this.tables)
      },
      closeTab () {
        this.$root.$emit(AppEvent.closeTab)
      },
      viewData() {
        this.$root.$emit(AppEvent.loadTable, { table: {
          entityType: 'table',
          name: this.table,
          schema: this.schema
        } })
      },
      goBack() {
        this.importStarted = false
      },
      async handleImport() {
        const importOptions = await this.tablesToImport.get(this.tableKey)
        let importerClass
        if (!importOptions.importProcessId) {
          importerClass = await this.$util.send('import/init', { options: importOptions })
        } else {
          importerClass = importOptions.importProcessId
        }
        const start = new Date()
        this.tab.isRunning = true
        this.importTable = importOptions.table
        this.importError = null
        try {
          this.importStarted = true
          const data = await this.$util.send('import/importFile', { id: importerClass })
          this.timer = `${(new Date() - start) / 1000} seconds`
        } catch (err) {
          this.importError = err.message
        } finally {
          this.tab.isRunning = false
        }
      }
    }
  }
</script>

<style lang="scss" scoped>
.not-supported {
  height: 100%;
  flex-direction: column;
  display: flex;
  justify-content: space-around;
  align-items: center;
}
.import-error-message {
  display: block;
  overflow-x: hidden;
  max-height: 30vh;
}
a:hover {
  text-decoration: none !important;
}
.import-progress {
  max-width: 500px;
  flex-direction: column;
  height: 100%;
  margin-top: 0 !important;
}
.copy-btn {
  margin-top: 1rem;
}
.spinning {
  animation: spin 5s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
