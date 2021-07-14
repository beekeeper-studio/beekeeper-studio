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
          <div class="dialog-c-title flex flex-middle">
            <div>
              Export
              <span class="text-primary truncate">{{ table.name }}</span> 
              <span v-if="filters" class="text-light" v-tooltip="filterTooltip">(Filtered)</span>
              <span class="badge badge-info">Beta</span>
            </div>
          </div>
          <span class="close-btn btn btn-fab">
            <i class="material-icons" @click.prevent="closeModal">clear</i>
          </span>
          <div v-if="error" class="alert alert-danger">
            <i class="material-icons">warning</i>
            <div>Error: {{ error.message }}</div>
          </div>
          <div class="modal-form export-form">
            
            <div class="flex">

              <!-- File Name -->
              <div class="file-name form-group expand">
                <label for="fileName">File Name</label>
                <input type="text" spellcheck="false" v-model="fileName">
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

           </div>

            <!-- Location -->
            <div class="form-group">
              <label for="fileDirectory">Output Directory</label>
              <file-picker 
                v-model="fileDirectory"
                :defaultPath="defaultPath"
                :save="false"
                :options="dialogOptions"
                buttonText="Choose"
                >
              </file-picker>
            </div>

            <!-- Advanced Options -->
            <div class="advanced-options-toggle flex flex-middle" @click.prevent="toggleAdvanced">
              <i class="material-icons">{{toggleIcon}}</i> 
              <span>Advanced Options</span>
            </div>
            <div class="advanced-options" :class="{open: advancedToggled}">
              <component
                v-bind:is="selectedExportFormat.component"
                v-model="outputOptions"
              ></component>
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

          </div>
        </div>
        <div class="vue-dialog-buttons">
          <button
            class="btn btn-flat"
            type="button"
            @click.prevent="closeModal"
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
import dateFormat from 'dateformat'
import { remote } from "electron"
import { mapMutations } from "vuex"
import rawlog from 'electron-log'
import { ExportFormCSV, ExportFormJSON, ExportFormSQL, ExportFormJsonLine } from "./forms"
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
  props: ['table', 'filters', 'connection'],
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
      const schema = this.table.schema ? `${this.table.schema}_` : ''
      const extension = this.selectedExportFormat.key
      return `${schema}${this.table.name}_export_${formatted}.${extension}`
    },
    filePath() {
      if (!this.fileDirectory || !this.fileName) return null
      return path.join(this.fileDirectory, this.fileName)
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
      return previous || platformInfo.downloadsDirectory
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
  },
  methods: {
    ...mapMutations({ addExport: "exports/addExport" }),
    async submit() {
      this.error = null;

      if (!this.filePath) {
        return;
      }
      this.$emit('export', { 
        table: this.table,
        filters: this.filters,
        filePath: this.filePath,
        options: this.options,
        outputOptions: this.outputOptions,
        exporter: this.selectedExportFormat.key
      })
      this.$modal.hide('export-modal')
    },
    closeModal () {
      this.$modal.hide('export-modal')
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
