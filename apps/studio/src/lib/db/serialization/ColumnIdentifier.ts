import { BksField, BksFieldType, ExtendedTableColumn } from "../models";
import { BaseQueryResult } from "../clients/BasicDatabaseClient";

/** A listed column before it knows its bks field. */
export type RawTableColumn = Omit<ExtendedTableColumn, "bksField">;

export class ColumnIdentifier<
  QueryResult extends BaseQueryResult = BaseQueryResult
> {
  identifyResultColumns(qr: QueryResult): BksField[] {
    return qr.columns.map((column) => ({
      name: column.name,
      bksType: this.identifyResultColumnType(column),
    }));
  }

  identifyListedColumn(column: RawTableColumn): BksField {
    return {
      name: column.columnName,
      bksType: this.identifyListedColumnType(column),
    };
  }

  protected identifyResultColumnType(
    _column: QueryResult["columns"][number]
  ): BksFieldType {
    return "UNKNOWN";
  }

  protected identifyListedColumnType(
    _column: RawTableColumn
  ): BksFieldType {
    return "UNKNOWN";
  }
}
