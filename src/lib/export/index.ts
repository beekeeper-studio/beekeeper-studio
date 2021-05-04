import { Export } from "./export";
import { CsvExporter } from "./formats/csv";
import { JsonExporter } from "./formats/json";
import { SqlExporter } from "./formats/sql";

export function Exporter(type: 'csv' | 'json' | 'sql'): any {
  switch (type) {
    case 'csv':
      return CsvExporter
    case 'json':
      return JsonExporter
    case 'sql':
      return SqlExporter
    default:
      throw new Error("unknown exporter type " + type)
  }
}
