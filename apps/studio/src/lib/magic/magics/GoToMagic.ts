import { TableOrView } from "@/lib/db/models";
import { Magic } from "../Magic";
import { MagicColumn } from "../MagicColumn";
import _ from "lodash";


const GoToMagic: Magic = {
  name: "GoToMagic",
  initializers: ['goto', 'fk'],
  render: function (args: string[]): MagicColumn {
    let toSchema: string | undefined
    let toTable: string | undefined
    let toColumn: string | undefined

    if (args.length < 3) return null

    if (args.length === 3) {
      [toTable] = args.slice(2)
    } else if (args.length === 4) {
      // if two, it's either table, column, or schema, table.
      [toTable, toColumn] = args.slice(2)
    } else {
      [ toSchema, toTable, toColumn] = args.slice(2)
    }

    const tableKey = {
      constraintName: "",
      fromColumn: "",
      fromSchema: "",
      fromTable: "",
      onDelete: "",
      onUpdate: "",
      toColumn,
      toSchema,
      toTable,
    }

    return {
      title: args[0],
      formatterParams: {
        fk: [tableKey],
      },
      cssClass: 'foreign-key',
    }
  },
  genAutocompleteHints(word, tables: TableOrView[], defaultSchema?: string): string[] {

    const args = word.split('__').filter((s) => !_.isEmpty(s))
    const newPrompt = word.endsWith('__')
    const incompleteWord = newPrompt ? null : args[args.length - 1]

    let result: string[] = []
    if (args.length < 2) return []
    if (args.length === 2 || (args.length === 3 && incompleteWord)) {

      const allSchemas = _.uniq(tables.flatMap((t) => t.schema ? [t.schema] : []))
      const allSchemalessTables = tables
      .filter((t) => !t.schema || t.schema === defaultSchema)
      .map((t) => t.name)
      result = [
        ...allSchemas,
        ...allSchemalessTables
      ]

    } else if (args.length === 3 || (args.length === 4 && incompleteWord)) {
      // table or schema only
      const selectedSchemaOrTable = args[2]
      const matchingTables = tables
        .filter((t) => t.schema && t.schema === selectedSchemaOrTable)
        .map((t) => t.name)
      const matchingColumns = tables
        .find((t) => (!t.schema || t.schema === defaultSchema) && t.name === selectedSchemaOrTable)
        ?.columns.map((c) => c.columnName) || []
      result = [
        ...matchingTables,
        ...matchingColumns
      ]

    } else if (args.length === 4 || (args.length === 5 && incompleteWord)) {
      // schema, table, now column
      const matchingColumns = tables.find((t) =>
        t.schema === args[2] && t.name === args[3]
      )?.columns.map((c) => c.columnName) || []
      result = [
        ...matchingColumns
      ]
    }
    return incompleteWord ? result.filter((w) => w.startsWith(incompleteWord) && w !== incompleteWord) : result
  }
}

export default GoToMagic
