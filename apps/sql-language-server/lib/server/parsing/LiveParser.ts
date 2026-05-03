import { Tree } from "@lezer/common";
import { Dialect } from "./dialects";

export interface ParseError {
  /** Character offset (inclusive) where the error region begins. */
  from: number;
  /** Character offset (exclusive) where the error region ends. */
  to: number;
  message: string;
}

/** Coarse classification of where the cursor sits within a SQL statement. */
export type ClauseContext =
  | "select"
  | "from"
  | "join"
  | "join-on"
  | "where"
  | "group-by"
  | "order-by"
  | "having"
  | "set"
  | "values"
  | "update"
  | "insert"
  | "delete"
  | "begin" // start of statement / unknown
  | "unknown";

export interface CursorContext {
  /** The clause containing the cursor. */
  clause: ClauseContext;
  /** True if the cursor is immediately after a `.` (qualified ref). */
  afterDot: boolean;
  /** If `afterDot`, the identifier preceding the dot (alias or schema). */
  qualifier?: string;
  /** Tables/aliases visible at this position (FROM and JOIN sources of the enclosing statement). */
  tablesInScope: TableRef[];
  /** Range of the partial identifier the cursor is currently on, if any. */
  partial?: { from: number; to: number; text: string };
}

export interface TableRef {
  /** Identifier as written in the source (e.g. "users" or "u"). */
  name: string;
  /** Underlying table name if `name` is an alias. */
  table?: string;
  /** Schema if qualified. */
  schema?: string;
}

/**
 * The error-tolerant live parser. Implementations must produce a tree even
 * for incomplete or invalid input — that's what makes the server usable as
 * the user types.
 *
 * v1: only LezerParser. The interface exists so we can swap in
 * web-tree-sitter later without touching feature code.
 */
export interface LiveParser {
  parse(text: string, dialect: Dialect): Tree;
  errors(tree: Tree, text: string): ParseError[];
  contextAt(tree: Tree, text: string, offset: number): CursorContext;
  /** Keywords for the dialect — used by completion. */
  keywords(dialect: Dialect): string[];
}
