import _ from 'lodash'

export default {
    methods: {
        dataToTableData(data, columns) {
            /*
              var data = [
                {id:1, name:"Oli Bob", age:"12", col:"red", dob:""},
                {id:2, name:"Mary May", age:"1", col:"blue", dob:"14/05/1982"},
                {id:3, name:"Christine Lobowski", age:"42", col:"green", dob:"22/05/1982"},
                {id:4, name:"Brendon Philips", age:"125", col:"orange", dob:"01/08/1980"},
                {id:5, name:"Margret Marmajuke", age:"16", col:"yellow", dob:"31/01/1999"},
              ];
            */
          const columnNamesOnly = columns.map((c) => c.field)
          return data.rows.map((row) => {
          return _.pick(row, columnNamesOnly)
          })
        },
        extractColumns(data) {
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
            return _.map(data.fields, (item) => {

                const result = {
                    title: item.name,
                    field: item.name,
                    dataType: item.dataType
                }
                return result
            })
        }
    },
    computed: {

    }
}
