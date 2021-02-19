<template>
    <div>
        <modal v-show="!minimized" class="vue-dialog beekeeper-modal" name="export-modal" height="auto" :scrollable="true">
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
                        <component v-bind:is="selectedExportFormat.component" :busy="busy" v-model="options"></component>
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
                    <template v-if="busy">
                        <button class="btn btn-flat" type="button" @click.prevent="cancelExport">Abort</button>
                        <button class="btn btn-flat" type="button" @click.prevent="minimize()">Minimize</button>
                    </template>
                    <template v-else>
                        <button class="btn btn-flat" type="button" @click.prevent="$emit('close')">Cancel</button>
                        <button class="btn btn-primary" type="submit" @click.prevent="chooseFile()">Run</button>
                    </template>
                </div>
            </form>
        </modal>
    </div>
</template>
<script>

import _ from 'lodash'
import { remote } from 'electron'
import Noty from 'noty'
import CsvExporter from '../lib/export/formats/csv'
import JsonExporter from '../lib/export/formats/json'
import SqlExporter from '../lib/export/formats/sql'
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
                { name: 'SQL', key: 'sql', component: ExportFormSQL, exporter: SqlExporter },
            ],
            busy: false,
            minimized: false,
            notification: new Noty({
                text: "Exporting...",
                layout: 'bottomRight',
                timeout: false,
                closeWith: 'button',
                buttons: [ 
                    Noty.button('Abort', 'btn btn-danger', () => this.cancelExport()),
                    Noty.button('Maximize', 'btn btn-flat', () => this.maximize())
                ],
                queue: 'export'
            }),
            progress: {
                recordsExported: 0,
                recordsTotal: 0,
                fileSize: 0
            },
            fileName: null,
            options: {},
            exporter: null
        }
    },
    computed: {
        selectedExportFormat() {
            return _.find(this.exportFormats, { key: this.selectedExportFormatKey })
        },
        progressPercent() {
            return Math.round(this.progress.recordsExported / this.progress.recordsTotal * 100)
        },
        notificationText() {
            return `Exporting ${this.progress.recordsExported} of ${this.progress.recordsTotal} rows from <code>${this.table.name}</code>...`
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

            this.exporter = new this.selectedExportFormat.exporter(
                this.fileName, 
                this.connection, 
                this.table, 
                '', 
                this.filters,
                this.options,
                this.updateProgress
            )

            this.resetProgress()
            this.exporter.exportToFile()         
        },
        cancelExport() {
            if (!this.exporter) {
                return
            }
            this.exporter.abort()
            this.notification.close()
            this.$noty.error("Export aborted")
            this.$root.$emit('hideExportTable')
        },
        updateProgress(countTotal, countExported, fileSize) {
            this.progress = {
                recordsTotal: countTotal,
                recordsExported: countExported,
                fileSize: fileSize
            }

            if (countTotal === countExported) {
                this.notification.close()
                this.$noty.success("Data successfully exported to: <br /><br /><code>" + this.fileName + "</code>")
                this.$root.$emit('hideExportTable')
            }

            if (this.notification) {
                this.notification.setText(this.notificationText)
            }
        },
        resetProgress() {
            this.progress = {
                recordsExported: 0,
                recordsTotal: 0,
                fileSize: 0
            }
        },
        minimize() {
            this.minimized = true
            this.notification.show()
        },
        maximize() {
            this.minimized = false
            this.notification.close()
        }
    },
    mounted() {
        this.$modal.show('export-modal')
    }
}
</script>