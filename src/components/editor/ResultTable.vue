<template>
  <div class="result-table">
    <div ref="tabulator"></div>
  </div>
</template>

<script type="text/javascript">
  import Tabulator from 'tabulator-tables'
  import _ from 'lodash'
  import dateFormat from 'dateformat'
  import Converter from '../../mixins/data_converter'

  export default {
    mixins: [Converter],
    data() {
      return {
        tabulator: null
      }
    },
    props: ['result', 'tableHeight', 'query'],
    watch: {
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
      tableHeight() {
        this.tabulator.setHeight(this.actualTableHeight)
      }
    },
    computed: {
      actualTableHeight() {
        return '100%'
        // let result = this.tableHeight
        // if (this.tableHeight == 0) {
        //   result = '100%'
        // }
        // return result
      },
    },
    async mounted() {
      this.tabulator = new Tabulator(this.$refs.tabulator, {
        data: this.tableData, //link data to table
        columns: this.tableColumns, //define table columns
        height: this.actualTableHeight,
        nestedFieldSeparator: false
      });
    },
    methods: {
      download() {
        const dateString = dateFormat(new Date(), 'yyyy-mm-dd_hMMss')
        const title = this.query.title ? _.snakeCase(this.query.title) : "query_results"
        this.tabulator.download('csv', `${title}-${dateString}.csv`, 'all')
      }
    }



	}


</script>
