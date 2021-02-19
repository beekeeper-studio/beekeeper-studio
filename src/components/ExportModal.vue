<template>
    <div>
        <modal class="vue-dialog beekeeper-modal" name="export-modal" height="auto" :scrollable="true">
            <form @submit.prevent="exportTable()">
                <div class="dialog-content">
                    <div class="dialog-c-title">Export</div>
                    <div class="dialog-c-subtitle"></div>
                    <div class="modal-form" v-show="!busy">
                        <div class="form-group">
                            <label for="connectionType">Format</label>
                            <select name="connectionType" class="form-control custom-select" v-model="selectedExportFormatKey" id="export-format-select" :disabled="busy">
                                <option disabled value="null">Select a format...</option>
                                <option :key="f.value" v-for="f in exportFormats" :value="f.key">{{f.name}}</option>
                            </select>
                        </div>
                        <component v-bind:is="selectedExportFormat.component" :busy="busy"></component>
                    </div>
                    <div v-if="busy">
                        <div class="export-progress">
                            <div class="flex flex-between">
                                <span>{{ progress.recordsExported }}/{{ progress.recordsTotal }} records</span>
                                <span>{{ progress.fileSize | prettyBytes }}</span>
                            </div>
                            <x-progressbar :value="progressPercent" max="100"></x-progressbar>
                        </div>
                    </div>
                </div>
                <div class="vue-dialog-buttons">
                    <button v-if="busy" class="btn btn-flat" type="button" @click.prevent="cancelExport">Abort</button>
                    <button v-else class="btn btn-flat" type="button" @click.prevent="$emit('close')">Cancel</button>
                    <button class="btn" :class="{'btn-link': busy, 'btn-primary': !busy}" type="submit" @click.prevent="chooseFile()">
                        <x-throbber v-if="busy"></x-throbber>
                        <span v-else>Run</span>
                    </button>
                </div>
            </form>
        </modal>
    </div>
</template>
<script>

import _ from 'lodash'
import { remote } from 'electron'
import { CsvExporter } from '../lib/export/formats/csv'
import { JsonExporter } from '../lib/export/formats/json'
import ExportFormCSV from './export/forms/ExportFormCSV'
import ExportFormJSON from './export/forms/ExportFormJSON'
import ExportFormSQL from './export/forms/ExportFormSQL'

export default {
    components: {ExportFormCSV, ExportFormSQL},
    props: {
        connection: {
            required: true
        },
        table: {
            default: null
        },
        filters: {
            default: []
        }
    },
    data() {
        return {
            selectedExportFormatKey: 'csv',
            exportFormats: [
                { name: 'CSV', key: 'csv', component: ExportFormCSV, exporter: CsvExporter },
                { name: 'JSON', key: 'json', component: ExportFormJSON, exporter: JsonExporter },
                { name: 'SQL', key: 'sql', component: ExportFormSQL, exporter: JsonExporter },
            ],
            busy: false,
            progress: {
                recordsExported: 0,
                recordsTotal: 0,
                fileSize: 0
            },
            fileName: null
        }
    },
    computed: {
        selectedExportFormat() {
            return _.find(this.exportFormats, { key: this.selectedExportFormatKey })
        },
        progressPercent() {
            return Math.round(this.progress.recordsExported / this.progress.recordsTotal * 100)
        }
    },
    methods: {
        chooseFile() {
            this.fileName = remote.dialog.showSaveDialogSync()

            if (this.fileName === undefined){
                console.log("You didn't save the file");
                return;
            }

            this.busy = true

            let exporter = new this.selectedExportFormat.exporter(
                this.fileName, 
                this.connection, 
                this.table, 
                '', 
                this.filters,
                this.updateProgress
            )

            this.resetProgress()
            exporter.exportToFile()         
        },
        cancelExport() {
            if (!this.busy) {
                return
            }
            this.$root.$emit('hideExportTable')
        },
        updateProgress(countTotal, countExported, fileSize) {
            this.progress = {
                recordsTotal: countTotal,
                recordsExported: countExported,
                fileSize: fileSize
            }

            if (countTotal === countExported) {
                this.$noty.success("Data successfully exported to: <br /><br /><code>" + this.fileName + "</code>")
                this.$root.$emit('hideExportTable')
            }
        },
        resetProgress() {
            this.progress = {
                recordsExported: 0,
                recordsTotal: 0,
                fileSize: 0
            }
        }
    },
    mounted() {
        this.$modal.show('export-modal')
    }
}
</script>