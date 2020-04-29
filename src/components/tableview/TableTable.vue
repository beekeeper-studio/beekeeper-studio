<template>
    <div class="tabletable">
        <div class="filter row">
            <div class="card">
                <form @submit.prevent="triggerFilter">
                    <label for="filter">Search (I should be an inline form) </label>
                    <select name="Filter Field" v-model="filter.field">
                        <option v-for="column in table.columns" v-bind:key="column.columnName" :value="column.columnName">{{column.columnName}}</option>
                    </select>
                    <select name="Filter Type" v-model="filter.type">
                        <option v-for="(v, k) in filterTypes" v-bind:key="k" :value="v">{{k}}</option>
                    </select>
                    <input type="text" v-model="filter.value">
                    <button class="btn btn-primary" type="submit">Search</button>
                    <button type="button" class="btn btn-danger" @click.prevent="clearFilter">Clear (I should be an (x) in the input box</button>
                </form>
            </div>
        </div>
        <div ref="table">

        </div>
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
            filterTypes: {
                "equals": "=",
                "does not equal": "!=",
                "like": "like",
                "less than": "<",
                "less than or equal": "<=",
                "greater than": ">",
                "greater than or equal": ">="
            },
            filter: {
                value: null,
                type: "=",
                field: this.table.columns[0].columnName
            },
            headerFilter: true,
            columnsSet: false,
            tabulator: null,
            actualTableHeight: "100%",
            loading: false,
        }
    },
    computed: {
        tableColumns() {
            return this.table.columns.map((column) => {
                return {title: column.columnName, field: column.columnName}
            })
        }
    },
    async mounted() {
        this.tabulator = new Tabulator(this.$refs.table, {
            height: this.actualTableHeight,
            columns: this.tableColumns,
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
        triggerFilter() {
            if(this.filter.type && this.filter.field) {
                if (this.filter.value) {
                    this.tabulator.setFilter(this.filter.field, this.filter.type, this.filter.value)
                } else {
                    this.tabulator.clearFilter()
                }
            }
        },
        clearFilter() {
            this.tabulator.clearFilter()
            this.filter.value = ""
        },
        dataFetch(url, config, params) {
            // this conforms to the Tabulator API
            // for ajax requests. Except we're just calling the database.
            // we're using paging so requires page info
            console.log({ url, config, params })

            let offset = 0
            let limit = 100
            let orderBy = null
            let filters = null

            if(params.sorters) {
                orderBy = params.sorters.map(element => {
                    return [element.field, element.dir]
                });
            }

            if(params.page && params.size) {
                limit = params.size
                offset = (params.page - 1) * params.size
            }

            if(params.filters) {
                filters = params.filters
            }

            const result = new Promise((resolve, reject) => {
                (async () => {
                    try {
                        const response = await this.connection.selectTop(
                        this.table.name,
                        offset,
                        limit,
                        orderBy,
                        filters
                    )
                    console.log("query data:")
                    const r = response.result
                    const totalRecords = response.totalRecords
                    const data = this.dataToTableData({ rows: r.data }, this.tableColumns)
                    resolve({
                        last_page: Math.ceil(totalRecords / limit),
                        data
                    })
                    } catch (error) {
                        reject()
                        throw error
                    }
                })()
            })
            return result;
        },
    }
}
</script>
