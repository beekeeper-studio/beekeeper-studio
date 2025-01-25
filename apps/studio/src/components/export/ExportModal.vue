<template>
  <div>
    <modal
      class="vue-dialog beekeeper-modal export-modal"
      name="export-modal"
      height="auto"
      :scrollable="true"
      @closed="$emit('closed')"
    >
      <!-- TODO: Make sure one of the elements in this modal is focused so that the keyboard trap works -->
      <form
        v-kbd-trap="true"
        @submit.prevent="submit"
      >
        <div class="dialog-content">
          <div class="dialog-c-title flex flex-middle">
            <div>
              Export
              <span class="text-primary truncate">{{ table ? table.name : queryName }}</span>
              <span
                v-if="filters"
                class="text-light"
                v-tooltip="filterTooltip"
              >(Filtered)</span>
              <span class="badge badge-info">Beta</span>
            </div>
          </div>

          <p>This will {{ table ? 'export table rows' : 'run your query and save the results' }}  directly to a file.</p>
          <p>You can choose the format and file name.</p>
          <p>
            For {{ table ? 'tables with many' : 'queries with many results' }} rows, this will run in the background,
            allowing you to continue to do other work.
          </p>

          <span class="close-btn btn btn-fab">
            <i
              class="material-icons"
              @click.prevent="closeModal"
            >clear</i>
          </span>
          <div
            v-if="error"
            class="alert alert-danger"
          >
            <i class="material-icons">error_outline</i>
            <div>Error: {{ error.message }}</div>
          </div>
          <div class="modal-form export-form">
            <div class="flex">
              <!-- File Name -->
              <div class="file-name form-group expand">
                <label for="fileName">File Name</label>
                <input
                  type="text"
                  spellcheck="false"
                  v-model="fileName"
                >
              </div>

              <!-- Format -->
              <div class="format form-group">
                <label for="connectionType">Format</label>
                <select
                  name="connectionType"
                  class="form-control custom-select"
                  v-model="selectedExportFormat"
                  id="export-format-select"
                >
                  <option
                    disabled
                    value="null"
                  >
                    Select a format...
                  </option>
                  <option
                    :key="f.value"
                    v-for="f in exportFormats"
                    :value="f"
                    :selected="selectedExportFormat === f.value"
                    :disabled="(f.name === 'SQL' && queryName) ? true : false"
                  >
                    {{ f.name }}
                  </option>
                </select>
              </div>
            </div>

            <!-- Location -->
            <div class="form-group">
              <label for="fileDirectory">Output Directory</label>
              <file-picker
                v-model="fileDirectory"
                :default-path="defaultPath"
                :save="false"
                :options="dialogOptions"
                button-text="Choose"
              />
            </div>

            <!-- Advanced Options -->
            <div
              class="advanced-options-toggle flex flex-middle"
              @click.prevent="toggleAdvanced"
            >
              <i class="material-icons">{{ toggleIcon }}</i>
              <span>Advanced Options</span>
            </div>
            <div
              class="advanced-options"
              :class="{open: advancedToggled}"
            >
              <component
                :is="selectedExportFormat.component"
                v-model="outputOptions"
              />
              <div class="modal-form export-form export-advanced-options">
                <div class="form-group row" v-if="!this.dialectData.disabledFeatures.chunkSizeStream">
                  <label title="How many records to read at once from the cursor">Chunk size</label>
                  <input
                    v-model="options.chunkSize"
                    type="number"
                    class="form-control"
                    ref="paramInput"
                    min="10"
                    step="10"
                  >
                </div>
                <div class="form-group row">
                  <label
                    for="deleteOnAbort"
                    class="checkbox-group"
                  >
                    <input
                      v-model="options.deleteOnAbort"
                      id="deleteOnAbort"
                      type="checkbox"
                      name="deleteOnAbort"
                      class="form-control"
                    >
                    <span>Delete file on abort/error</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="vue-dialog-buttons">
          <button
            class="btn btn-flat btn-icon"
            type="button"
            @click.prevent="importExportTables"
          >
            <i class="material-icons">tab</i>
            Export multiple tables
          </button>
          <button
            class="btn btn-primary"
            type="submit"
            :disabled="!filePath"
          >
            Run
          </button>
        </div>
      </form>
    </modal>
  </div>
</template>
<script>
import dateFormat from 'dateformat'
import { mapMutations, mapGetters } from "vuex"
import rawlog from '@bksLogger'
import { ExportFormCSV, ExportFormJSON, ExportFormSQL, ExportFormJsonLine } from "./forms"
import FilePicker from '../common/form/FilePicker.vue'
import { AppEvent } from '@/common/AppEvent'
const log = rawlog.scope('export/export-modal')

const exportFormats = [
  {
    name: "CSV",
    key: "csv",
    component: ExportFormCSV,
  },
  {
    name: "JSON",
    key: "json",
    component: ExportFormJSON,
  },
  {
    name: 'JSON Lines',
    key: 'jsonl',
    component: ExportFormJsonLine
  },
  {
    name: "SQL",
    key: "sql",
    component: ExportFormSQL,
  },
]

export default {
  components: { FilePicker },
  props: ['table', 'query', 'queryName', 'filters'],
  data() {
    return {
      selectedExportFormat: exportFormats[0],
      exportFormats,
      options: { chunkSize: 100, deleteOnAbort: true, includeFilter: true },
      outputOptions: {},
      error: null,
      fileDirectory: null,
      fileName: null,
      advancedToggled: false
    };
  },
  watch: {
    table() {
      if (this.table) {
        this.$modal.show("export-modal");
      }
    },
    query() {
      if (this.query) {
        this.$modal.show("export-modal");
      }
    },
    fileDirectory() {
      if (this.fileDirectory) {
        localStorage.setItem('export/directory', this.fileDirectory)
      }
    },
    selectedExportFormat() {
      if (!this.fileName) return
      const split = this.fileName.split('.')
      if (split.length < 2) return
      split[split.length - 1] = this.selectedExportFormat.key
      this.fileName = split.join(".")
    }
  },
  computed: {
    defaultFileName () {
      const now = new Date();
      const formatted = dateFormat(now, 'yyyy-mm-dd_HHMMss')
      const extension = this.selectedExportFormat.key
      let fileName;
      if (this.table) {
        const schema = this.table.schema ? `${this.table.schema}_` : ''
        const extension = this.selectedExportFormat.key
        fileName = `${schema}${this.table.name}_export_${formatted}.${extension}`
      } else {
        // sanitize query name for use as filename
        let queryFileName = this.queryName.replace(/[^a-z0-9]/gi, '_').toLowerCase()
        queryFileName = queryFileName.replace(/_+/gi, '_') // avoid double-underscores
        queryFileName = queryFileName.replace(/^_/gi, '')   // remove any leading underscore
        queryFileName = queryFileName.replace(/_$/gi, '')   // remove any trailing underscore
        fileName = `${queryFileName}_${formatted}.${extension}`
      }
      return fileName
    },
    filePath() {
      if (!this.fileDirectory || !this.fileName) return null
      return window.main.join(this.fileDirectory, this.fileName)
    },
    dialogOptions() {
      const result = { buttonLabel: 'Choose Directory', properties: [ 'openDirectory', 'createDirectory'] }
      return result
    },
    hasFilters() {
      return this.filters && this.filters.length;
    },
    defaultPath() {
      let previous = localStorage.getItem('export/directory')
      if (previous === 'undefined' || previous === 'null') previous = null
      return previous || this.$config.downloadsDirectory
    },
    filterTooltip() {
      if (!this.hasFilters) {
        return null;
      }
      return JSON.stringify(this.filters, null, 2);
    },
    filterCount() {
      if (!this.hasFilters) {
        return null;
      } else if (typeof this.filters === "string") {
        return 1;
      } else {
        return this.filters.length;
      }
    },
    toggleIcon() {
      return this.advancedToggled ? 'keyboard_arrow_down' : 'keyboard_arrow_right'
    },
    ...mapGetters(['dialectData']),
  },
  methods: {
    async submit() {
      this.error = null;

      if (!this.filePath) {
        return;
      }

      // eslint-disable-next-line
      const component = this;

      const payload = {
        table: this.table,
        query: this.query,
        queryName: this.queryName,
        filters: this.filters,
        filePath: this.filePath,
        options: this.options,
        outputOptions: this.outputOptions,
        exporter: this.selectedExportFormat.key
      }
      this.$emit('export', payload) // handled by ExportManager
      this.$modal.hide('export-modal')
    },
    importExportTables() {
      this.$root.$emit(AppEvent.exportTables);
      this.closeModal();
    },
    closeModal() {
      this.$modal.hide('export-modal')
    },
    upgradeModal() {
      this.closeModal()
      this.$root.$emit(AppEvent.upgradeModal)
    },
    toggleAdvanced() {
      this.advancedToggled = !this.advancedToggled
    }
  },
  mounted() {
    this.fileDirectory = this.defaultPath
    this.fileName = this.defaultFileName
    this.$modal.show("export-modal");
  },
};
</script>
