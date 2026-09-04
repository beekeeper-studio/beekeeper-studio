import { BksField, BksFieldType, ExtendedTableColumn } from "../models";
import { BaseQueryResult } from "../clients/BasicDatabaseClient";

/** A listed column before it knows its bks field. */
export type RawTableColumn = Omit<ExtendedTableColumn, "bksField">;

export class FieldResolver<
  QueryResult extends BaseQueryResult = BaseQueryResult
> {
  resolveQueryResult(queryResult: QueryResult): BksField[] {
    return queryResult.columns.map((column) => ({
      name: column.name,
      bksType: this.resolveRuntimeColumnType(column, queryResult),
    }));
  }

  resolveListTableColumns(columns: RawTableColumn[]): BksField[] {
    return columns.map((column) => ({
      name: column.columnName,
      bksType: this.resolveDeclaredColumnType(column, columns),
    }));
  }

  protected resolveRuntimeColumnType(
    _column: QueryResult["columns"][number],
    _queryResult: QueryResult
  ): BksFieldType {
    return "UNKNOWN";
  }

  protected resolveDeclaredColumnType(
    _column: RawTableColumn,
    _columns: RawTableColumn[]
  ): BksFieldType {
    return "UNKNOWN";
  }
}
