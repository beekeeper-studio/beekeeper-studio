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
              v-model="options"
            ></component>
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
import _ from "lodash";
import { remote } from "electron";
import { mapMutations } from "vuex";
import CsvExporter from "@/lib/export/formats/csv";
import JsonExporter from "@/lib/export/formats/json";
import SqlExporter from "@/lib/export/formats/sql";
import ExportFormCSV from "./forms/ExportFormCSV";
import ExportFormJSON from "./forms/ExportFormJSON";
import ExportFormSQL from "./forms/ExportFormSQL";
import { Export } from "@/lib/export/export";

export default {
  components: { ExportFormCSV, ExportFormSQL },
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
      fileName: null,
      options: {},
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

      this.fileName = remote.dialog.showSaveDialogSync(null, {
        defaultPath: [this.table.name, this.selectedExportFormat.key].join("."),
      });

      if (this.fileName === undefined) {
        return;
      }

      try {
        const exporter = new this.selectedExportFormat.exporter(
          this.fileName,
          this.connection,
          this.table,
          this.filters,
          this.options
        );

        this.$emit("close");
        this.$emit("exportCreated", exporter);
        this.addExport(exporter);

        exporter.exportToFile();
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