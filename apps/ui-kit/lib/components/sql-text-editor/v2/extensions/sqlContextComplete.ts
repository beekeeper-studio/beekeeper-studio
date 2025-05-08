/**
 * A CodeMirror extension that provides SQL-aware autocomplete suggestions.
 * – Triggers completion after typing SQL keywords like SELECT, FROM, JOIN, etc.
 * – Offers column names based on the current query context or table aliases.
 * – Allows you to inject a custom columnsGetter to lazy load columns.
 *
 * Usage:
 *   import { sql } from "./customSql";
 *   import { sqlContextComplete, sqlContextCompletionSource } from "./sqlContextComplete";
 *
 *   // Register the extensions
 *   const extensions = [
 *    customSql(undefined, sqlContextCompletionSource), // Must have sql() extension from customSql.ts
 *    sqlContextComplete(),
 *   ]
 */

import {
  CompletionContext,
  CompletionResult,
  startCompletion,
} from "@codemirror/autocomplete";
import { syntaxTree } from "@codemirror/language";
import {
  StateEffect,
  StateField,
  Extension,
  Text,
  EditorState,
} from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { columnsToCompletions } from "../utils";
import getAliases from "../getAliases";
import { entities } from "./customSql";
import { Entity } from "lib/components/types";

type ColumnsGetter = (entity: Entity) => string[] | Promise<string[]>;

const setColumnsGetter = StateEffect.define<ColumnsGetter>();
const columnsGetter = StateField.define<ColumnsGetter | null>({
  create() {
    return null;
  },
  update(value, tr) {
    for (let e of tr.effects) {
      if (e.is(setColumnsGetter)) return e.value;
    }
    return value;
  },
});

function applyColumnsGetter(view: EditorView, columnsGetter: ColumnsGetter) {
  view.dispatch({ effects: setColumnsGetter.of(columnsGetter) });
}

function sqlContextComplete(): Extension {
  return [
    columnsGetter,
    EditorView.updateListener.of((update) => {
      // Check if typing occurred
      if (update.docChanged) {
        let spaceInserted = false;

        update.changes.iterChanges(
          (fromA: any, toA: any, fromB: any, toB: any, inserted: any) => {
            if (inserted.length === 1 && inserted.text[0] === " ") {
              spaceInserted = true;
            }
          }
        );

        if (spaceInserted) {
          const cursor = update.state.selection.main.head;
          const line = update.state.doc.lineAt(cursor);
          const textBefore = line.text.slice(0, cursor - line.from);

          // Check if we just typed a space after FROM or JOIN
          if (/\b(SELECT|FROM|JOIN|WHERE|AND|OR)\s$/i.test(textBefore)) {
            // Trigger autocomplete
            startCompletion(update.view);
          }
        }
      }
    }),
  ];
}

/**
 * Handle autocomplete context and provide column completions
 */
async function sqlCompletionSource(
  context: CompletionContext
): Promise<CompletionResult> {
  const word = context.matchBefore(/\w*/);
  if (!word) return null;

  if (!context.state.field(columnsGetter)) {
    return null;
  }

  const cursor = context.pos;
  const doc = context.state.doc;

  // Check for dot completion (table.column)
  let columns: string[];

  const dotColumns = await getDotCompletionColumns(context, cursor, doc);

  if (dotColumns) {
    columns = dotColumns;
  } else if (context.explicit) {
    let foundColumns = await loadColumnsFromQueryContext(context.state, cursor);
    if (foundColumns) {
      columns = foundColumns;
    }
  }

  if (columns && columns.length) {
    return {
      from: word.from,
      options: columnsToCompletions(columns),
    };
  }

  return null;
}

/**
 * Handle dot completion (e.g., table.column or alias.column)
 */
async function getDotCompletionColumns(
  context: CompletionContext,
  cursor: number,
  doc: Text
): Promise<string[] | null> {
  const line = doc.lineAt(cursor);
  const textBeforeCursor = line.text.substring(0, cursor - line.from);
  const lastDotPos = textBeforeCursor.lastIndexOf(".");

  if (lastDotPos < 0) return null;

  const textBeforeDot = textBeforeCursor.substring(0, lastDotPos);
  const identifierMatch = textBeforeDot.match(/([A-Za-z0-9_]+)$/);
  if (!identifierMatch || !identifierMatch[1]) return null;

  const identifier = identifierMatch[1];
  const node = syntaxTree(context.state).resolveInner(cursor, -1);
  const aliases = getAliases(doc, node);

  // Get table name (either directly or from alias)
  const tableName =
    aliases && identifier in aliases && aliases[identifier].length > 0
      ? aliases[identifier][0]
      : identifier;

  return await requestColumns(
    tableName,
    context.state.field(entities),
    context.state.field(columnsGetter)
  );
}

/**
 * Request columns for a specific table
 */
async function requestColumns(
  tableName: string,
  entities: Entity[],
  columnsGetter: ColumnsGetter
): Promise<string[]> {
  if (!columnsGetter) {
    return [];
  }
  const entity = entities.find((e) => e.name === tableName);
  if (entity) {
    return await columnsGetter(entity);
  }
  return [];
}

/**
 * Identify relevant tables from query context at cursor position and load columns
 */
async function loadColumnsFromQueryContext(
  state: EditorState,
  cursor: number
): Promise<string[]> {
  const doc = state.doc;
  const line = doc.lineAt(cursor);
  const textBeforeCursor = line.text.substring(0, cursor - line.from);

  if (!isColumnCompletionPosition(textBeforeCursor)) {
    return [];
  }

  const tables = getTablesFromContext(state, doc, line, cursor);

  // Request columns for all tables and combine results
  const columns = [];
  for (const tableName of tables) {
    columns.push(
      ...(await requestColumns(
        tableName,
        state.field(entities),
        state.field(columnsGetter)
      ))
    );
  }
  return columns;
}

/**
 * Check if cursor is at a position where column completion makes sense
 */
function isColumnCompletionPosition(textBeforeCursor: string): boolean {
  const completionPatterns = [
    /\bSELECT\s+$/i, // After SELECT
    /\bSELECT.+,\s*$/i, // After comma in SELECT
    /\b(WHERE|AND|OR)\s+$/i, // After WHERE/AND/OR
    /\b(ORDER\s+BY|GROUP\s+BY|HAVING)\s+$/i, // After ORDER BY/GROUP BY/HAVING
    /\bJOIN.+\bON\s+$/i, // After JOIN...ON
  ];

  return completionPatterns.some((pattern) => pattern.test(textBeforeCursor));
}

/**
 * Collect all tables from the current SQL context
 */
function getTablesFromContext(
  state: EditorState,
  doc: Text,
  line: any,
  cursor: number
): Set<string> {
  // Get the statement node and any table aliases
  const node = syntaxTree(state).resolveInner(cursor, -1);
  const aliases = getAliases(doc, node);

  // Get nearby context (5 lines before and after)
  const contextStart = Math.max(0, line.number - 5);
  const contextEnd = Math.min(doc.lines, line.number + 5);
  const contextText = getContextText(doc, contextStart, contextEnd);

  // Collect tables from different sources
  const tables = new Set<string>();

  // Add tables from aliases
  if (aliases) {
    for (const [_, tablePath] of Object.entries(aliases)) {
      if (tablePath?.length > 0) {
        tables.add(tablePath[0]);
      }
    }
  }

  // Add tables from FROM clauses
  const fromMatches = contextText.match(/\bFROM\s+([a-zA-Z0-9_]+)/gi);
  if (fromMatches) {
    for (const match of fromMatches) {
      tables.add(match.replace(/\bFROM\s+/i, "").trim());
    }
  }

  return tables;
}

/**
 * Extract text from multiple lines for context analysis
 */
function getContextText(doc: Text, startLine: number, endLine: number): string {
  let contextText = "";
  for (let i = startLine; i <= endLine; i++) {
    if (i > 0 && i <= doc.lines) {
      contextText += doc.line(i).text + "\n";
    }
  }
  return contextText;
}

export {
  ColumnsGetter,
  applyColumnsGetter,
  sqlContextComplete,
  sqlCompletionSource,
};
