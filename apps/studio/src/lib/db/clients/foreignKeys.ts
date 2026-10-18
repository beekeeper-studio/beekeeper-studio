import _ from "lodash";
import { TableKey } from "@shared/lib/dialects/models";

/**
 * One foreign-key *column* as read from a database catalog. Drivers map their
 * catalog rows to this shape and hand them to `groupForeignKeyRows`, which
 * assembles the `TableKey`s. Keeping the grouping in one place means every
 * driver handles composite keys, column order and naming collisions the same
 * way.
 */
export interface ForeignKeyRow {
  /**
   * Constraint name as the engine reports it. Engines without named
   * constraints (SQLite's pragma ids, for example) can pass a number.
   */
  constraintName?: string | number | null;
  fromSchema?: string | null;
  fromTable: string;
  fromColumn: string;
  toSchema?: string | null;
  toTable: string;
  toColumn: string;
  /**
   * 1-based (or 0-based, only relative order matters) position of the column
   * within the constraint. When every row of a constraint carries one, the
   * columns are ordered by it; otherwise the input order is kept.
   */
  ordinalPosition?: number | null;
  onUpdate?: string | null;
  onDelete?: string | null;
}

/**
 * Rows belonging to the same constraint are identified by the constraint
 * name *and* both tables. Constraint names alone are not unique across a
 * schema in PostgreSQL (they are per-table) or SQLite (pragma ids restart at
 * 0 for every table), so incoming keys from several tables that happen to
 * share a name must not be merged into one bogus composite key.
 */
function groupId(row: ForeignKeyRow): string {
  return [
    row.fromSchema ?? "",
    row.fromTable,
    row.constraintName ?? "",
    row.toSchema ?? "",
    row.toTable,
  ].join("\u0000");
}

function hasPosition(row: ForeignKeyRow): boolean {
  return typeof row.ordinalPosition === "number" && Number.isFinite(row.ordinalPosition);
}

/**
 * Group per-column foreign key rows into `TableKey`s.
 *
 * - One `TableKey` per constraint, in order of first appearance.
 * - Single-column keys expose `fromColumn` / `toColumn` as strings; composite
 *   keys expose them as arrays, paired by index, and set `isComposite`.
 * - Column order follows `ordinalPosition` when present, else input order.
 */
export function groupForeignKeyRows(rows: ForeignKeyRow[]): TableKey[] {
  const groups = new Map<string, ForeignKeyRow[]>();

  for (const row of rows) {
    const id = groupId(row);
    const group = groups.get(id);
    if (group) {
      group.push(row);
    } else {
      groups.set(id, [row]);
    }
  }

  return Array.from(groups.values()).map((parts) => {
    const ordered = parts.every(hasPosition)
      ? _.sortBy(parts, (p) => p.ordinalPosition)
      : parts;
    const first = ordered[0];
    const isComposite = ordered.length > 1;

    return {
      constraintName: first.constraintName == null ? undefined : String(first.constraintName),
      fromSchema: first.fromSchema ?? "",
      fromTable: first.fromTable,
      fromColumn: isComposite ? ordered.map((p) => p.fromColumn) : first.fromColumn,
      toSchema: first.toSchema ?? "",
      toTable: first.toTable,
      toColumn: isComposite ? ordered.map((p) => p.toColumn) : first.toColumn,
      onUpdate: first.onUpdate ?? undefined,
      onDelete: first.onDelete ?? undefined,
      isComposite,
    };
  });
}
