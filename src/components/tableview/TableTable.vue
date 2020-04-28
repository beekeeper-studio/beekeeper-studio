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
            </template>
        </footer>

    </div>
</template>

<style>
    /* G, I'm sorry for this */
    .tabletable {
        /* Temporary */
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
            headerFilter: true,
            columnsSet: false,
            tabulator: null,
            offset: 0,
            limit: 100,
            totalRecords: 0,
            result: [],
            actualTableHeight: "100%",
            loading: false,
            orderBy: []
        }
    },
    watch: {
        tableColumns: {
            handler() {
            // this.tabulator.setColumns(this.tableColumns)
            }
        },
    },
    computed: {
        currentMax() {
            return Math.min(this.offset + this.limit, this.totalRecords)
        },
        changeTrigger() {
            return [this.offset, this.limit, this.orderBy]
        },
        pagedData() {
            return {
                last_page: Math.ceil(this.totalRecords / this.limit),
                data: this.tableData
            }
        }
    },
    async mounted() {
        this.tabulator = new Tabulator(this.$refs.table, {
            data: this.tableData,
            columns: this.tableColumns,
            height: this.actualTableHeight,
            nestedFieldSeparator: false,
            ajaxRequestFunc: this.dataFetch,
            ajaxURL: "http://fake",
            ajaxSorting: true,
            ajaxFiltering: true,
            pagination: 'remote',
            paginationSize: this.limit
        })
    },
    methods: {
        dataFetch(url, config, params) {
            console.log({ url, config, params })
            if(params.sorters) {
                this.orderBy = params.sorters.map(element => {
                    return [element.field, element.dir]
                });
            }

            if(params.page && params.size) {
                this.limit = params.size
                this.offset = (params.page - 1) * params.size
            }

            const result = new Promise((resolve, reject) => {
                this.fetch().then(() => {
                    console.log("fetched!")
                    this.$nextTick(() => {
                        if(!this.columnsSet) {
                            this.columnsSet = true
                            this.tabulator.setColumns(this.tableColumns)
                        }
                        resolve(this.pagedData)
                    })
                }).catch(() => {
                    reject()
                })

            })
            return result;
        },
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
