<template>
  <div>
    <modal
      class="vue-dialog beekeeper-modal export-modal"
      name="export-modal"
      height="auto"
      :scrollable="true"
    >
      <form @submit.prevent="exportTable()">
        <div class="dialog-content">
          <div class="dialog-c-title">
            Export from <span class="text-primary">{{ table.name }}</span>
          </div>
          <div class="dialog-c-subtitle" v-show="hasFilters">
            <span v-show="hasFilters"
              >using {{ filterCount }} filter(s)
              <i
                class="material-icons"
                v-tooltip="{ content: filterString, html: true }"
                >info_outlined</i
              ></span
            >
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
                v-model="selectedExportFormatKey"
                id="export-format-select"
              >
                <option disabled value="null">Select a format...</option>
                <option
                  :key="f.value"
                  v-for="f in exportFormats"
                  :value="f.key"
                >
                  {{ f.name }}
                </option>
              </select>
            </div>
            <component
              v-bind:is="selectedExportFormat.component"
              v-model="outputOptions"
            ></component>
            <div class="modal-form export-form export-advanced-options">
              <div class="dialog-c-title">Advanced Options</div>
              <div class="form-group row">
                <label>Chunk size</label>
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
        <div class="vue-dialog-buttons">
          <button
            class="btn btn-flat"
            type="button"
            @click.prevent="$emit('close')"
          >
            Cancel
          </button>
          <button
            class="btn btn-primary"
            type="submit"
            @click.prevent="chooseFile()"
          >
            Run
          </button>
        </div>
      </form>
    </modal>
  </div>
</template>
<script>
import _ from "lodash"
import { remote } from "electron"
import { mapMutations } from "vuex"
import { Export, CsvExporter, JsonExporter, SqlExporter } from "@/lib/export"
import { ExportFormCSV, ExportFormJSON, ExportFormSQL } from "./forms"

export default {
  props: {
    connection: {
      required: true,
    },
    table: {
      default: null,
    },
    filters: {
      default: [],
    },
  },
  data() {
    return {
      selectedExportFormatKey: "csv",
      exportFormats: [
        {
          name: "CSV",
          key: "csv",
          component: ExportFormCSV,
          exporter: CsvExporter,
        },
        {
          name: "JSON",
          key: "json",
          component: ExportFormJSON,
          exporter: JsonExporter,
        },
        {
          name: "SQL",
          key: "sql",
          component: ExportFormSQL,
          exporter: SqlExporter,
        },
      ],
      options: { chunkSize: 500, deleteOnAbort: false },
      outputOptions: {},
      Export: Export,
      error: null,
    };
  },
  computed: {
    selectedExportFormat() {
      return _.find(this.exportFormats, { key: this.selectedExportFormatKey });
    },
    hasFilters() {
      return this.filters && this.filters.length;
    },
    filterString() {
      if (!this.hasFilters) {
        return;
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
    async chooseFile() {
      this.error = null;

      const filePath = remote.dialog.showSaveDialogSync(null, {
        defaultPath: [this.table.name, this.selectedExportFormat.key].join("."),
      });

      if (filePath === undefined) {
        return;
      }

      try {
        const exporter = new this.selectedExportFormat.exporter(
          filePath,
          this.connection,
          this.table,
          this.filters,
          this.options,
          this.outputOptions
        );

        this.addExport(exporter);
        exporter.exportToFile();

        this.$emit("close");
      } catch (error) {
        this.error = error;
      }
    },
  },
  mounted() {
    this.$modal.show("export-modal");
  },
};
</script>
