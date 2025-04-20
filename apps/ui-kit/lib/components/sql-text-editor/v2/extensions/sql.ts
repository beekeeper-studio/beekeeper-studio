/**
 * Core SQL extension for CodeMirror that adds enhanced SQL language support.
 * Includes custom autocompletion for database tables and columns using SqlContextAnalyzer
 * to determine the current query context and provide relevant suggestions.
 */
import { Extension, Facet, StateEffect, StateField } from "@codemirror/state";
import { sql, SQLConfig } from "@codemirror/lang-sql";
import { CompletionContext, CompletionResult } from "@codemirror/autocomplete";
import { columnsToCompletions } from "../utils";
import { SqlContextAnalyzer } from "../SqlContextAnalyzer";

export function sqlExtension(config?: SQLConfig): Extension {
  const sqlExtension = sql(config);
  return [
    sqlContextAnalyzerExtension,
    sqlExtension,
    // Add autocompletion support with our custom source
    sqlExtension.language.data.of({
      autocomplete: (context: CompletionContext) =>
        handleCompletionContext(context),
    }),
  ];
}

export const setSqlContextAnalyzer = StateEffect.define<SqlContextAnalyzer>();

const SqlContextAnalyzerFacet = Facet.define<
  SqlContextAnalyzer,
  SqlContextAnalyzer
>({
  combine: (values) => (values.length ? values[0] : null),
});

const sqlContextAnalyzerExtension =
  StateField.define<SqlContextAnalyzer | null>({
    create() {
      return null;
    },
    update(value, tr) {
      for (let e of tr.effects) {
        if (e.is(setSqlContextAnalyzer)) return e.value;
      }
      return value;
    },
    provide: (field) => SqlContextAnalyzerFacet.from(field),
  });

/**
 * Handle autocomplete context and provide column completions
 */
async function handleCompletionContext(
  context: CompletionContext
): Promise<CompletionResult> {
  const word = context.matchBefore(/\w*/);
  if (!word) return null;

  const sqlContextAnalyzer = context.state.facet(SqlContextAnalyzerFacet);

  if (!sqlContextAnalyzer) {
    return null;
  }

  const cursor = context.pos;
  const doc = context.state.doc;

  // Check for dot completion (table.column)
  let columns: string[];

  const dotColumns = await sqlContextAnalyzer.getDotCompletionColumns(
    context,
    cursor,
    doc
  );

  if (dotColumns) {
    columns = dotColumns;
  } else if (context.explicit) {
    let foundColumns = await sqlContextAnalyzer.loadColumnsFromQueryContext(
      context.state,
      cursor
    );
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
