<template>
  <div class="result-table">
    <div ref="tabulator"></div>
  </div>
</template>

<script type="text/javascript">
  import Tabulator from 'tabulator-tables'
  import _ from 'lodash'
  import dateFormat from 'dateformat'

  export default {
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
      tableData() {
        /*
          var data = [
            {id:1, name:"Oli Bob", age:"12", col:"red", dob:""},
            {id:2, name:"Mary May", age:"1", col:"blue", dob:"14/05/1982"},
            {id:3, name:"Christine Lobowski", age:"42", col:"green", dob:"22/05/1982"},
            {id:4, name:"Brendon Philips", age:"125", col:"orange", dob:"01/08/1980"},
            {id:5, name:"Margret Marmajuke", age:"16", col:"yellow", dob:"31/01/1999"},
          ];
        */

        let columnArray = _.map(this.tableColumns, (col) => {
          return col.field
        })
        let result = _(this.result.rows)
          .map((row) => {
            return _.pick(row, columnArray)
          }).value()
        return result
      },
      tableTruncated() {
        return this.result.truncated
      },
      tableColumns() {
        // columns here
        /*
        [
          { title: "Name", field: "name", width: 150 },
          { title: "Age", field: "age", align: "left", formatter: "progress" },
          { title: "Favourite Color", field: "col" },
          { title: "Date Of Birth", field: "dob", align: "center" },
          { title: "Rating", field: "rating", align: "center", formatter: "star" },
          { title: "Passed?", field: "passed", align: "center", formatter: "tickCross" }
        ]

        */
        return _.map(this.result.fields, (item) => {
          return {
            title: _.capitalize(item.name),
            field: item.name

          }
        })
      }
    },
    async mounted() {
      this.tabulator = new Tabulator(this.$refs.tabulator, {
        data: this.tableData, //link data to table
        columns: this.tableColumns, //define table columns
        height: this.actualTableHeight

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
