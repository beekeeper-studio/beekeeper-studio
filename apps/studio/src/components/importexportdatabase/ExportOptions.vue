<template>
  <div class="small-wrap">
    <form
      class="card-flat padding"
    >
      <div class="page-content">
        <div class="flex flex-between">
          <h3 class="card-title">
            File Options
          </h3>
        </div>
        <div class="export-form">
          <div class="alert alert-info">
            <i class="material-icons">info_outline</i> {{ filesToBeExported }}
          </div>
          <div class="flex">
            <div class="file-name form-group expand">
              <label for="fileName">File name format
                <i
                  class="material-icons"
                  v-tooltip="fileFormatTooltip"
                >help_outlined</i>
              </label>
              <input
                type="text"
                spellcheck="false"
                v-model="fileName"
              >
            </div>
            <div class="format form-group">
              <label for="exportFormat">Format</label>
              <select
                name="exportFormat"
                class="form-control custom-select"
                v-model="selectedExportFormat"
                id="multi-export-format-select"
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
        </div>
      </div>
    </form>
    <form class="card-flat padding">
      <div class="dialog-content">
        <div class="export-form">
          <!-- Advanced Options -->
          <div class="flex flex-between">
            <h3 class="card-title">
              Advanced Export Options
            </h3>
          </div>
          <div class="advanced-options open">
            <component
              :is="selectedExportFormat.component"
              v-model="outputOptions"
            />
            <div class="modal-form export-form export-advanced-options">
              <div class="form-group row">
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
    </form>
  </div>
</template>

<script>
import pluralize from 'pluralize'
import dateFormat from 'dateformat'
import { mapGetters, mapMutations, mapState } from "vuex"
import rawlog from '@bksLogger'
import { ExportFormCSV, ExportFormJSON, ExportFormSQL, ExportFormJsonLine } from "../export/forms"
import FilePicker from '../common/form/FilePicker.vue'
const log = rawlog.scope('export/multi-export-manager')

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
  props: [],
  data() {
    return {
      selectedExportFormat: exportFormats[0],
      options: { chunkSize: 100, deleteOnAbort: true, includeFilter: true },
      outputOptions: {},
      fileDirectory: null,
      fileName: dateFormat(new Date(), 'yyyy-mm-dd_HHMMss')
    };
  },
  computed: {
    ...mapGetters(['dialectData']),
    ...mapGetters('multiTableExports', ['isSelectTableComplete']),
    ...mapState('multiTableExports', ['exportSchema', 'tablesToExport']),
    exportFormats() {
      return exportFormats.filter((format) =>
        !this.dialectData.disabledFeatures?.export?.[format.key]
      )
    },
    filesToBeExported() {
      return `${pluralize('files', this.tablesToExport.length, true)} will be created, one for each table exported`
    },
    optionalFileName () {
      if (this.fileName) return `_${this.fileName}`
      return ''
    },
    filenameSchema () {
      const schema = this.exportSchema ? `${this.exportSchema}_` : ''
      return `${schema}{{table name}}`
    },
    filePath() {
      return this.fileDirectory || null
    },
    dialogOptions() {
      const result = { buttonLabel: 'Choose Directory', properties: [ 'openDirectory', 'createDirectory'] }
      return result
    },
    defaultPath() {
      let previous = localStorage.getItem('export/directory')
      if (previous === 'undefined' || previous === 'null') previous = null
      return previous || this.$config.downloadsDirectory
    },
    fileFormatTooltip() {
      return `Format of Export File Names is ${this.filenameSchema}${this.optionalFileName}.${this.selectedExportFormat.key}`
    }
  },
  methods: {
    onNext() {
      this.error = null;

      if (!this.fileDirectory) {
        return;
      }

      const payload = {
        filters: this.filters ?? [],
        filePath: this.fileDirectory,
        options: this.options,
        fileNameOptions: this.fileName,
        outputOptions: this.outputOptions,
        exporter: this.selectedExportFormat.key
      }
      localStorage.setItem('export/directory', this.fileDirectory)
      this.$store.commit('multiTableExports/updateOptions', payload)
    },
    canContinue() {
      return this.isSelectTableComplete && Boolean(this.fileName)
    }
  },
  mounted() {
    this.fileDirectory = this.defaultPath
  },
};
</script>

<style lang="scss" scoped>
@import '../../assets/styles/app/_variables';

form {
  width: 90%;
  margin: 2rem auto 0 auto;
}
.export-form {
  & .flex {
    align-items: end;
  }
}
.file-name {
  &__wrapper {
    display: flex;
  }
  &__details {
    font-size: 0.85rem;
    line-height: 1.5;
    padding: 0 0.2rem;
    margin: 0 0 1rem 0;
    font-style: italic;
  }
}
</style>
