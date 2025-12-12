/**
 * A CodeMirror extension that provides SQL-aware autocomplete suggestions.
 * – Triggers completion after typing SQL keywords like SELECT, FROM, JOIN, etc.
 * – Offers column names based on the current query context or table aliases.
 * – Allows you to inject a custom columnsGetter to lazy load columns.
 * A CodeMirror extension that triggers completion after typing SQL keywords
 * like SELECT, FROM, JOIN, etc.
 *
 * Usage:
 *   import { sql } from "./customSql";
 *   import { sqlContextComplete, sqlCompletionSource } from "./sqlContextComplete";
 *   import { sqlContextComplete } from "./sqlContextComplete";
 *
 *   // Register the extensions
 *   const extensions = [
 *    sql(), // NOTE: must use sql extension from ./customSql.ts
 *    sqlContextComplete(), // trigger completion while typing
 *    sqlCompletionSource((entity) => {
 *      return ["column1", "column2", "column3"];
 *    }) // custom columnsGetter
 *   ]
 */

import { Completion, startCompletion, closeCompletion } from "@codemirror/autocomplete";
import { EditorState, Extension, Text } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { schemaCompletionFilter, completeConfig } from "./vendor/@codemirror/lang-sql/src/complete";
import { Entity } from "../../types";
import { columnsToCompletions, getAliases } from "../utils";
import { configFacet, entities } from "./customSql";
import { syntaxTree } from "@codemirror/language";
import { matchEntity } from "../../../utils/entity";

type ColumnsGetter = (
  entity: Entity,
  options: Completion[]
) => string[] | Promise<string[]>;

function sqlContextComplete(): Extension {
  return [
    EditorView.updateListener.of((update) => {
      // Check if typing occurred
      if (update.docChanged) {
        let spaceInserted = false;

        update.changes.iterChanges(
          (_fromA: any, _toA: any, _fromB: any, _toB: any, inserted: any) => {
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
          if (/\b(FROM|JOIN)\s$/i.test(textBefore)) {
            // Trigger autocomplete
            startCompletion(update.view);
          } else {
            // Close autocomplete if open (e.g., after typing table name)
            closeCompletion(update.view);
          }
        }
      }
    }),
  ];
}

function sqlCompletionSource(columnsGetter: ColumnsGetter) {
  return [
    schemaCompletionFilter.of(async (context, source, options) => {
      const { parents, aliases } = source;

      // If the builtin sql completion can't find the table name
      if (parents.length === 0) {
        try {
          const columns = await loadColumnsFromQueryContext(
            context.state,
            context.pos,
            columnsGetter
          );
          const dialect = context.state.facet(completeConfig).dialect;
          options = options.concat(columnsToCompletions(columns, dialect));
        } catch (e) {
          console.error(e);
        }
        return options;
      }

      // Here, the builtin sql completion found the table name

      // Get last segment (table or alias)
      const last = parents[parents.length - 1];
      const path = aliases?.[last];
      let table = last;
      let schema: string | undefined;
      // let alias: string | undefined;

      if (path) {
        // Resolve alias
        // alias = last;
        if (path.length === 2) {
          schema = path[0];
          table = path[1];
        } else {
          table = path[0];
        }
      }

      const entity = getEntity(context.state, table, schema);

      try {
        const columns = (await columnsGetter(entity, options)) || [];
        const dialect = context.state.facet(completeConfig).dialect;
        options = options.concat(columnsToCompletions(columns, dialect));
      } catch (e) {
        console.error(e);
      }

      return options;
    }),
  ];
}

/**
 * Identify relevant tables from query context at cursor position and load columns
 */
async function loadColumnsFromQueryContext(
  state: EditorState,
  cursor: number,
  columnsGetter: ColumnsGetter
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
    const gotColumns = await columnsGetter(getEntity(state, tableName), []);
    if (gotColumns) {
      columns.push(...gotColumns);
    }
  }
  return columns;
}

/**
 * Check if cursor is at a position where column completion makes sense
 */
function isColumnCompletionPosition(textBeforeCursor: string): boolean {
  const completionPatterns = [
    /\bSELECT\s+/i, // After SELECT (with or without trailing content)
    /\bSELECT.+,\s*/i, // After comma in SELECT
    /\b(WHERE|AND|OR)\s+/i, // After WHERE/AND/OR
    /\b(ORDER\s+BY|GROUP\s+BY|HAVING)\s+/i, // After ORDER BY/GROUP BY/HAVING
    /\bJOIN.+\bON\s+/i, // After JOIN...ON
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
      if (Array.isArray(tablePath) && tablePath.length > 0) {
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

function getEntity(state: EditorState, table: string, schema?: string) {
  const config = state.facet(configFacet);

  return (
    state.field(entities).find((e) => {
      if (
        e.entityType !== "table" &&
        e.entityType !== "view" &&
        e.entityType !== "materialized-view"
      ) {
        return false;
      }

      return matchEntity(
        e,
        { entityType: e.entityType, name: table, schema },
        config.defaultSchema
      );
    }) ?? { schema, entityType: "table", name: table }
  );
}

export { sqlContextComplete, sqlCompletionSource, ColumnsGetter };
