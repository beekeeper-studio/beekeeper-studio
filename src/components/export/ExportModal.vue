<template>
  <div>
    <modal
      class="vue-dialog beekeeper-modal export-modal"
      name="export-modal"
      height="auto"
      :scrollable="true"
      @closed="$emit('closed')"
    >
      <form @submit.prevent="submit">
        <div class="dialog-content">
          <div class="dialog-c-title">
            Export 
            <span class="text-primary">{{ table.name }}</span> 
            <span v-if="filters" class="text-secondary" v-tooltip="filterTooltip">(Filtered)</span>
          </div>
          <div v-if="error" class="alert alert-danger">
            <i class="material-icons">warning</i>
            <div>Error: {{ error.message }}</div>
          </div>
          <div class="modal-form export-form">
            <div class="form-group">
              <label for="connectionType">Format</label>
              <select
                name="connectionType"
                class="form-control custom-select"
                v-model="selectedExportFormat"
                id="export-format-select"
              >
                <option disabled value="null">Select a format...</option>
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

            <!-- Advanced Options -->
            <div class="advanced-options">
              <component
                v-bind:is="selectedExportFormat.component"
                v-model="outputOptions"
              ></component>
              <div class="modal-form export-form export-advanced-options">
                <div class="dialog-c-title">Advanced Options</div>
                <div class="form-group row">
                  <label title="How many records to read at once from the cursor">Chunk size</label>
                    <input
                      v-model="options.chunkSize"
                      type="number"
                      class="form-control"
                      ref="paramInput"
                      min="10"
                      step="10"
                    />
                </div>
                <div class="form-group row">
                  <label for="deleteOnAbort" class="checkbox-group">
                    <input
                      v-model="options.deleteOnAbort"
                      id="deleteOnAbort"
                      type="checkbox"
                      name="deleteOnAbort"
                      class="form-control"
                    />
                    <span>Delete file on abort/error</span>
                  </label>
                </div>
              </div>
            </div>
            <!-- End Advanced -->
            <file-picker 
              v-model="filePath"
              :defaultPath="defaultPath"
              :save="true"
              :options="dialogOptions"
              >
            </file-picker>

          </div>
        </div>
        <div class="vue-dialog-buttons">
          <button
            class="btn btn-flat"
            type="button"
          >
            Cancel
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
import * as path from 'path'
import { remote } from "electron"
import { mapMutations } from "vuex"
import rawlog from 'electron-log'
import { ExportFormCSV, ExportFormJSON, ExportFormSQL } from "./forms"
import FilePicker from '../common/form/FilePicker'
import platformInfo from '../../common/platform_info'
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
    name: "SQL",
    key: "sql",
    component: ExportFormSQL,
  },
]

export default {
  components: { FilePicker },
  props: ['table', 'filters', 'connection'],
  data() {
    return {
      selectedExportFormat: exportFormats[0],
      exportFormats,
      options: { chunkSize: 100, deleteOnAbort: true, includeFilter: true },
      outputOptions: {},
      error: null,
      filePath: null
    };
  },
  watch: {
    table() {
      if (this.table) {
        this.$modal.show("export-modal");
      }
    }
  },
  computed: {
    dialogOptions() {
      const result = { buttonLabel: 'OK', properties: [ 'showOverwriteConfirmation', 'createDirectory'] }
      return result
    },
    hasFilters() {
      return this.filters && this.filters.length;
    },
    defaultFileName() {
      const schema = this.table.schema ? `${this.table.schema}_` : ''
      const extension = this.selectedExportFormat.key
      return `${schema}${this.table.name}_export_.${extension}`
    },
    defaultPath() {
      return path.join(platformInfo.downloadsDirectory, this.defaultFileName)
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
  },
  methods: {
    ...mapMutations({ addExport: "exports/addExport" }),
    async submit() {
      this.error = null;

      if (this.filePath === undefined) {
        return;
      }
      this.$emit('export', { 
        filePath: this.filePath,
        options: this.options,
        outputOptions: this.outputOptions,
        exporter: this.selectedExportFormat.key
      })
      this.$modal.hide('export-modal')
    },
  },
  mounted() {
    this.$modal.show("export-modal");
  },
};
</script>
