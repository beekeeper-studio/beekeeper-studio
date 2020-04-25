<template>
    <div ref="table">
        
    </div>
</template>
<script>
import Tabulator from 'tabulator-tables'
import data_converter from '../../mixins/data_converter'
export default {
    mixins: [data_converter],
    props: ['table', 'connection'],
    data() {
        return {
            tabulator: null,
            offset: 0,
            limit: 100,
            orderBy: null,
            totalRecords: 0,
            result: [],
            actualTableHeight: "100%"
        }
    },
    watch: {
        async changeTrigger() {
            this.fetch()
        },
        tableData: {
            handler() {
            this.tabulator.replaceData(this.tableData)
            }
        },
        tableColumns: {
            handler() {
            this.tabulator.setColumns(this.tableColumns)
            }
        },
    },
    computed: {
        changeTrigger() {
            return [this.offset, this.limit, this.orderBy]
        },
    },
    async mounted() {
        this.tabulator = new Tabulator(this.$refs.table, {
            data: this.tableData,
            columns: this.tableColumns,
            height: this.actualTableHeight,
            nestedFieldSeparator: false
        })
        this.fetch()
    },
    methods: {
        async fetch() {
            const response = await this.connection.selectTop(
                this.table.name,
                this.offset,
                this.limit,
                this.orderBy
            )
            this.result = response.data[0]
            this.totalRecords = response.totalRecords
        }
    }
}
</script>