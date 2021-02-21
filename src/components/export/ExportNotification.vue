<template>
    <span></span>
</template>
<script>
import Noty from 'noty'
import { Export } from '../../lib/export/export'

export default {
    props: {
        exporter: {
            required: true
        }
    },
    data() {
        return {
            notification: new Noty({
                text: "Exporting...",
                layout: 'bottomRight',
                timeout: false,
                closeWith: 'button',
                buttons: [ 
                    Noty.button('Abort', 'btn btn-danger', () => this.cancelExport())
                ],
                queue: 'export'
            })
        }
    },
    computed: {
        notificationText() {
            return `
            <div class="export-progress-notification">
                <div class="title">Exporting from <span class="text-primary">${this.exporter.table.name}</span></div>
                <div class="flex flex-between progress-info">
                    <div>${this.timeLeftReadable}</div>
                    <div>${this.exporter.countExported} / ${this.exporter.countTotal} rows</div>
                    <div>${this.$options.filters.prettyBytes(this.exporter.fileSize)}</div>
                </div>
                <x-progressbar class="progress-bar" value="${this.progressPercent}" max="100"></x-progressbar>
            </div>
            `
        },
        progressPercent() {
            if (!this.exporter) {
                return 0
            }

            return Math.round(this.exporter.countExported / this.exporter.countTotal * 100)
        },
        timeLeftReadable() {
            if (!this.exporter) {
                return 0
            } 
            
            return new Date(this.exporter.timeLeft).toISOString().substr(11, 8)
        }
    },
    methods: {
        cancelExport() {
            if (!this.exporter) {
                return
            }
            this.exporter.abort()
            this.notification.close()
            this.$noty.error("Export aborted")
        }
    },
    watch: {
        exporter: {
            deep: true,
            handler() {
                if (this.notification) {
                    this.notification.setText(this.notificationText)
                }
            }
        }
    },
    mounted() {
        this.notification.show()
    },
    beforeDestroy() {
        if (this.exporter.status === Export.Status.Completed) {
            this.notification.close()
            new Noty({
                type: "success",
                text: "Data successfully exported to: <br /><br /><code>" + this.exporter.fileName + "</code>",
                layout: 'bottomRight',
                timeout: 3000,
                closeWith: 'button',
                buttons: [ 
                    Noty.button('Open', 'btn btn-success', () => this.exporter.openFile())
                ],
                queue: 'export'
            }).show()
        }

        if (this.exporter.status === Export.Status.Error) {
            this.notification.close()
            this.$noty.error("Error while exporting.")
        }

        console.log('unmounting')
        this.notification.close()
    }
}
</script>