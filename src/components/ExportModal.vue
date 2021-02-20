<template>
    <div>
        <modal v-show="!minimized" class="vue-dialog beekeeper-modal export-modal" name="export-modal" height="auto" :scrollable="true">
            <form @submit.prevent="exportTable()">
                <div class="dialog-content">
                    <div class="dialog-c-title">Export from <span class="text-primary">{{ table.name }}</span></div>
                    <div class="dialog-c-subtitle" v-show="hasFilters">
                        <span v-show="hasFilters">using {{ filterCount }} filter(s) <i class="material-icons" v-tooltip="{ content: filterString, html: true }">info_outlined</i></span>
                    </div>
                    <div v-if="!exporter || exporter.status === Export.Status.Idle" class="modal-form export-form">
                        <div class="form-group">
                            <label for="connectionType">Format</label>
                            <select name="connectionType" class="form-control custom-select" v-model="selectedExportFormatKey" id="export-format-select">
                                <option disabled value="null">Select a format...</option>
                                <option :key="f.value" v-for="f in exportFormats" :value="f.key">{{f.name}}</option>
                            </select>
                        </div>
                        <component v-bind:is="selectedExportFormat.component" v-model="options"></component>
                    </div>
                    <div v-else-if="exporter && exporter.status === Export.Status.Exporting" class="export-progress">
                        <div class="flex flex-between">
                            <span>{{ timeLeftReadable }}</span>
                            <span>{{ exporter.countExported }} / {{ exporter.countTotal }} rows</span>
                            <span>{{ exporter.fileSize | prettyBytes }}</span>
                        </div>
                        <x-progressbar :value="progressPercent" max="100"></x-progressbar>
                    </div>
                    <div v-else-if="exporter && exporter.status === Export.Status.Error">
                        Error!
                    </div>
                </div>
                <div class="vue-dialog-buttons">
                    <template v-if="exporter && exporter.status === Export.Status.Exporting">
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
import { Export } from '../lib/export/export'

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
            fileName: null,
            options: {},
            exporter: null,
            editor: null,
            error: null,
            Export: Export
        }
    },
    computed: {
        selectedExportFormat() {
            return _.find(this.exportFormats, { key: this.selectedExportFormatKey })
        },
        progressPercent() {
            if (!this.exporter) {
                return 0
            }

            return Math.round(this.exporter.countExported / this.exporter.countTotal * 100)
        },
        notificationText() {
            return `
            <div class="export-progress-notification">
                <div class="title">Exporting from <span class="text-primary">${this.table.name}</span></div>
                <div class="flex flex-between progress-info">
                    <div>${this.timeLeftReadable}</div>
                    <div>${this.exporter.countExported} / ${this.exporter.countTotal} rows</div>
                    <div>${this.$options.filters.prettyBytes(this.exporter.fileSize)}</div>
                </div>
                <x-progressbar class="progress-bar" value="${this.progressPercent}" max="100"></x-progressbar>
            </div>
            `
        },
        hasFilters() {
            return this.filters && this.filters.length
        },
        filterString() {
            if (!this.hasFilters) {
                return
            }

            return JSON.stringify(this.filters, null, 2)
        },
        filterCount() {
            if (!this.hasFilters) {
                return null
            } else if (typeof this.filters === "string") {
                return 1
            } else {
                return this.filters.length
            }
        },
        timeLeftReadable() {
            if (!this.exporter) {
                return 0
            } 
            
            return new Date(this.exporter.timeLeft).toISOString().substr(11, 8)
        }
    },
    methods: {
        async chooseFile() {
            this.fileName = remote.dialog.showSaveDialogSync(null, {
                defaultPath: [this.table.name, this.selectedExportFormat.key].join('.')
            })

            if (this.fileName === undefined){
                return
            }

            this.exporter = new this.selectedExportFormat.exporter(
                this.fileName, 
                this.connection, 
                this.table, 
                this.filters,
                this.options
            )

            await this.exporter.exportToFile()
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
        minimize() {
            this.minimized = true
            this.notification.show()
        },
        maximize() {
            this.minimized = false
            this.notification.close()
        }
    },
    watch: {
        exporter: {
            deep: true,
            handler(exporter) {
                if (exporter.status === Export.Status.Completed) {
                    this.notification.close()
                    this.$noty.success("Data successfully exported to: <br /><br /><code>" + exporter.fileName + "</code>")
                    this.$root.$emit('hideExportTable')
                }

                if (this.notification) {
                    this.notification.setText(this.notificationText)
                }
            }
        }
    },
    mounted() {
        this.$modal.show('export-modal')
    }
}
</script>