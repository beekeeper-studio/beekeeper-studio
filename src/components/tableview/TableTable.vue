<template>
    <div class="tabletable">
        <div v-show="loading" class="loading-overlay">LOADING</div>
        <div ref="table">
            
        </div>
        <footer class="status-bar row-query-meta">
            <template v-if="result">
                <div class="row-counts">
                    Showing {{offset + 1}} to {{currentMax}} of {{totalRecords}} records.
                </div>
                <span class="expand"></span>
                <a :disabled="offset === 0" class="btn btn-fab" @click.prevent="previousPage"><i class="material-icons">arrow_back</i></a>
                <a :disabled="currentMax >= totalRecords" @click.prevent="nextPage" class="btn btn-fab"><i class="material-icons">arrow_forward</i></a>

            </template>
        </footer>

    </div>
</template>

<style>
    /* G, I'm sorry for this */
    .tabletable {
        height: 500px;
    }
    .loading-overlay {
        position: absolute;
        right: 50%;
        top: 200px;
    }
</style>

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
            totalRecords: 0,
            result: [],
            actualTableHeight: "100%",
            loading: false,
            sortOrders: {}
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
        orderBy() {
            return Object.keys(this.sortOrders).map((key) => {
                return [key, this.sortOrders[key]]
            });
        },
        currentMax() {
            return Math.min(this.offset + this.limit, this.totalRecords)
        },
        changeTrigger() {
            return [this.offset, this.limit, this.orderBy]
        },
    },
    async mounted() {
        this.tabulator = new Tabulator(this.$refs.table, {
            data: this.tableData,
            columns: this.tableColumns,
            height: this.actualTableHeight,
            nestedFieldSeparator: false,
            headerSort: false

            // ajaxSorting: true
        })
        this.fetch()
    },
    methods: {
        headerClick(event, component) {
            console.log(component)
            const column = component._column
            const so = this.sortOrders[column.field]
            console.log("header clicked %s, %s", event, column)
            console.log(column)

            if (so && so === 'asc') {
                this.$set(this.sortOrders, column.field, 'desc')
            } else {
                this.$set(this.sortOrders, column.field, 'asc')
            }
        },
        sortTriggered() {
            console.log("sort triggered")
        },
        nextPage() {
            this.offset = this.currentMax
        },
        previousPage() {
            this.offset = this.offset - this.limit
        },
        async fetch() {
            this.loading = true
            try {
                const response = await this.connection.selectTop(
                    this.table.name,
                    this.offset,
                    this.limit,
                    this.orderBy
                )
                this.result = response.data[0]
                this.totalRecords = response.totalRecords                
            } finally {
                this.loading = false
            }
        }
    }
}
</script>