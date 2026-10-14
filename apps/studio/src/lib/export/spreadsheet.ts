import type { Tabulator } from 'tabulator-tables'
import { isBksInternalColumn } from '@/common/utils'
import { TableFilter, TableOrView } from '@/lib/db/models'

/**
 * Payload for AppEvent.openInSpreadsheet (handled by ExportManager).
 * Pass `rows` for data that is already loaded, or `table` to stream every
 * row of the table (filters applied).
 */
export interface OpenInSpreadsheetOptions {
  /** used for the file and sheet names */
  name: string
  rows?: SpreadsheetData
  table?: TableOrView
  filters?: TableFilter[] | string | null
}

export interface SpreadsheetData {
  header: string[]
  rows: unknown[][]
}

/**
 * The visible columns of a tabulator table, in display order, with the
 * rows it currently holds (eg: the current page of a table).
 */
export function tabulatorSpreadsheetData(tabulator: Tabulator): SpreadsheetData {
  const columns = tabulator.getColumns().filter((column) => {
    const field = column.getField()
    return field && column.isVisible() && !isBksInternalColumn(field)
  })
  const header = columns.map((column) => {
    const title = column.getDefinition().title
    return typeof title === 'string' && title ? title : column.getField()
  })
  const fields = columns.map((column) => column.getField())
  // 'active' = what's on screen, sorted and with any local search applied
  const rows = tabulator.getData('active').map((row) => fields.map((field) => row[field]))
  return { header, rows }
}
