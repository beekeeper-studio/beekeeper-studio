import { TableOrView } from "@/lib/db/models"

export interface ImportMap {
  fileColumn: string
  tableColumn: string
}

export interface ImportOptions {
  fileName: string
  columnDelimeter: string | null
  quoteCharacter: string | null
  escapeCharacter: string | null
  newlineCharacter: string | null
  nullableValues: string[]
  trimWhitespaces: boolean 
  truncateTable: boolean
  runAsUpsert: boolean
  useHeaders: boolean
  fileType: string
  table: TableOrView
  importMap: ImportMap[] | null
  sheet: string | null
}
