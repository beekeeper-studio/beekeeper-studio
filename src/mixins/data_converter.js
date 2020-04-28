import _ from 'lodash'

export default {
    computed: {
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
                let postfix = ''
                if (this.sortOrders) {
                    const so = this.sortOrders[item.name]
                    postfix = so ? ` (${so})` : ""
                }


                const result = {
                    title: `${_.capitalize(item.name)}${postfix}`,
                    field: item.name,
                    formatter: 'html',
                    headerFilter: this.headerFilter ? 'input' : false
                }
                return result
            })
        }
    }
}
