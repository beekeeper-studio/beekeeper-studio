import { CsvExporter } from "./formats/csv";
import { JsonExporter } from "./formats/json";
import { SqlExporter } from "./formats/sql";

export type ExportType = 'csv' | 'json' | 'sql'

export function Exporter(type: ExportType): any {
  switch (type) {
    case 'csv':
      return CsvExporter
      break
    case 'json':
      return JsonExporter
      break
    case 'sql':
      return SqlExporter
      break
    default:
      throw new Error("unknown exporter type " + type)
  }
}
