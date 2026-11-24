import _ from "lodash";
import { State } from "@/handlers/handlerState";
import { uniqueColumnNames } from "@/common/utils";
import {
  DatabaseEntity,
  ExtendedTableColumn,
  NgQueryResult,
  TableColumn,
} from "@/lib/db/models";
import {
  CLI_MAX_QUERY_ROWS,
  BinaryValue,
  Column,
  Entity,
  CliEntityType,
  StatementResult,
  CliClientInfo,
} from "@beekeeperstudio/cli-client";

/** Who made a request, and whether they are still waiting for the answer. */
export interface CliCallContext {
  client: CliClientInfo;
  /** Aborted when the caller hangs up, e.g. after its timeout. */
  signal: AbortSignal;
}

export const UNKNOWN_CLIENT_NAME = "Unknown client";

export function clientInfo(raw: unknown): CliClientInfo {
  const name =
    typeof (raw as any)?.name === "string"
      ? (raw as any).name.trim().slice(0, 100)
      : "";
  return { name: name || UNKNOWN_CLIENT_NAME };
}

export const CHANGE_ACCESS_HINT =
  "Access is chosen when the client is approved. Reconnect in Beekeeper Studio, then run `bks ask-approval --timeout 0` to choose again.";

const FILE_BASED_TYPES = ["sqlite", "duckdb", "libsql"];

export const READ_ONLY_HINT =
  "The connection is in read only mode, so only statements that read data run. Turn read only " +
  "mode off in the connection settings to allow writes.";

export function connectionDisplayName(state: State): string {
  const config = state.usedConfig;
  if (config?.name) {
    return config.name;
  }
  const type =
    config?.connectionType || state.connection?.connectionType || "database";
  const database = state.database || config?.defaultDatabase;
  // The host is a placeholder for file based databases; the path says it all.
  const location = FILE_BASED_TYPES.includes(type)
    ? database
    : [config?.host, database].filter(Boolean).join("/");
  return location ? `${type} ${location}` : `${type} ${state.id.slice(0, 8)}`;
}

/** Runs `fn`, turning a failure into a warning instead of failing the whole command. */
export async function attempt<T>(
  label: string,
  warnings: string[],
  fn: () => Promise<T>,
): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    warnings.push(`${label}: ${error?.message ?? error}`);
    return null;
  }
}

export function toEntity(
  entity: DatabaseEntity,
  entityType: CliEntityType,
): Entity {
  return { schema: entity.schema || undefined, name: entity.name, entityType };
}

export function toColumn(column: ExtendedTableColumn | TableColumn): Column {
  const extended = column as Partial<ExtendedTableColumn>;
  return _.omitBy(
    {
      name: column.columnName,
      dataType: column.dataType,
      nullable: extended.nullable,
      defaultValue: extended.defaultValue,
      primaryKey: extended.primaryKey,
      comment: extended.comment,
      ordinalPosition: extended.ordinalPosition,
      generated: extended.generated,
      array: extended.array,
      enumValues: extended.enumValues,
    },
    _.isUndefined,
  ) as Column;
}

/** Binary cells as hex; JSON would otherwise write a Buffer as an array of bytes. */
function cellValue(value: unknown): unknown {
  if (value instanceof ArrayBuffer) {
    return {
      type: "binary",
      encoding: "hex",
      data: Buffer.from(value).toString("hex"),
    } satisfies BinaryValue;
  }
  if (ArrayBuffer.isView(value)) {
    const buffer = Buffer.from(
      value.buffer,
      value.byteOffset,
      value.byteLength,
    );
    return {
      type: "binary",
      encoding: "hex",
      data: buffer.toString("hex"),
    } satisfies BinaryValue;
  }
  return value;
}

export function formatQueryResult(result: NgQueryResult): StatementResult {
  const rows = result.rows || [];
  let fields = result.fields || [];
  if (fields.length === 0) {
    fields = Object.keys(rows[0] || {}).map((name) => ({ id: name, name }));
  }
  const columns = uniqueColumnNames(
    fields.map((field) => field.name ?? field.id),
  );

  const limited = rows.slice(0, CLI_MAX_QUERY_ROWS);
  const mapped = limited.map((row) => {
    const out: Record<string, unknown> = {};
    fields.forEach((field, index) => {
      out[columns[index]] = cellValue(
        Array.isArray(row) ? row[index] : row[field.id],
      );
    });
    return out;
  });

  const clientTruncated = !!result.truncated;
  return {
    command: result.command ?? null,
    columns,
    rows: mapped,
    rowCount: mapped.length,
    totalRowCount: clientTruncated
      ? (result.totalRowCount ?? rows.length)
      : rows.length,
    truncated: clientTruncated || rows.length > CLI_MAX_QUERY_ROWS,
    maxRows: CLI_MAX_QUERY_ROWS,
    affectedRows: result.affectedRows ?? null,
  };
}
