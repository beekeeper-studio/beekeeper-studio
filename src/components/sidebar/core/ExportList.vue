<template>
    <div class="sidebar-favorites flex-col expand">
        <div class="sidebar-list">
            <nav class="list-group" v-if="exports.length > 0">
                <div class="list-item" v-for="item in exports" v-bind:key="item.id">
                    <a class="list-item-btn" @click.prevent="select(item)" :class="{active: false}">
                        <i v-if="item.status === Export.Status.Exporting" class="item-icon text-primary material-icons">file_download</i>
                        <i v-if="item.status === Export.Status.Completed" class="item-icon text-success material-icons">check</i>
                        <i v-if="item.status === Export.Status.Aborted" class="item-icon text-danger material-icons">close</i>
                        <i v-if="item.status === Export.Status.Error" class="item-icon text-danger material-icons">error</i>
                        <div class="list-title flex-col">
                            <span class="item-text title truncate expand" :title="item.title">
                                Select * From {{item.table.name}}
                            </span>
                            <span v-if="item.status === Export.Status.Exporting" class="database subtitle">
                                <div class="flex flex-between progress-info">
                                    <span>{{ timeLeftReadable(item) }}</span>
                                    <span>{{ item.countExported }} / {{ item.countTotal }}</span>
                                    <span>{{ $options.filters.prettyBytes(item.fileSize) }}</span>
                                </div>
                                <x-progressbar class="progress-bar" :value="progressPercent(item)" max="100"></x-progressbar>
                            </span>
                            <span v-else class="database subtitle">
                                <div class="flex flex-between progress-info">
                                    <span>{{ item.countExported }} records</span>
                                    <span>{{ $options.filters.prettyBytes(item.fileSize) }}</span>
                                </div>
                            </span>
                        </div>
                        <x-contextmenu>
                            <x-menu style="--target-align: right; --v-target-align: top;">
                                <x-menuitem v-if="item.status === Export.Status.Completed" @click="item.openFile()">
                                    <x-label>Open File</x-label>
                                </x-menuitem>
                                <x-menuitem v-if="item.status === Export.Status.Exporting" @click="item.abort()">
                                    <x-label class="text-danger">Abort</x-label>
                                </x-menuitem>
                            </x-menu>
                        </x-contextmenu>
                    </a>
                </div>
            </nav>
            <div class="empty" v-if="exports.length === 0">
                <span>No Exports</span>
            </div>
        </div>
  </div>
</template>
<script>
import { mapGetters } from 'vuex'
import { Export } from '../../../lib/export/export'

export default {
    data() {
        return {
            Export: Export
        }
    },
    computed: {
        ...mapGetters({'exports': 'exports/allExports'})
    },
    methods: {
        select(exporter) {
            console.log('export selected', exporter)
        },
        progressPercent(exporter) {
            if (!exporter) {
                return 0
            }

            return Math.round(exporter.countExported / exporter.countTotal * 100)
        },
        timeLeftReadable(exporter) {
            if (!exporter) {
                return 0
            } 
            
            return new Date(exporter.timeLeft).toISOString().substr(11, 8)
        }
    }
}
</script>