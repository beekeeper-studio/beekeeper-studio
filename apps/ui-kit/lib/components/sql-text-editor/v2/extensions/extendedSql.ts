/**
 * Core SQL extension for CodeMirror that adds enhanced SQL language support.
 * Includes custom autocompletion for database tables and columns using SqlContextAnalyzer
 * to determine the current query context and provide relevant suggestions.
 */
import { Extension, StateEffect, StateField } from "@codemirror/state";
import { sql, SQLConfig } from "@codemirror/lang-sql";
import { CompletionContext, CompletionResult } from "@codemirror/autocomplete";
import { buildSchema, columnsToCompletions } from "../utils";
import { ColumnsGetter, SqlContextAnalyzer } from "../SqlContextAnalyzer";
import { EditorView } from "@codemirror/view";
import { Entity } from "../../../types";
import { Compartment } from "@codemirror/state";

const sqlCompartment = new Compartment();
const setEntities = StateEffect.define<Entity[]>();
const entities = StateField.define<Entity[]>({
  create() {
    return [];
  },
  update(value, tr) {
    for (let e of tr.effects) {
      if (e.is(setEntities)) return e.value;
    }
    return value;
  },
});
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

export function extendedSql(config?: SQLConfig): Extension {
  const sqlExtension = sql(config);
  return [
    entities,
    columnsGetter,
    sqlCompartment.of([
      sqlExtension,
      // Add autocompletion support with our custom source
      sqlExtension.language.data.of({
        autocomplete: (context: CompletionContext) =>
          handleCompletionContext(context),
      }),
    ]),
  ];
}

/**
 * Apply SQL extension with schema information
 */
export function applySqlExtension(
  view: EditorView,
  options?: {
    defaultSchema?: string;
    entities?: Entity[];
  }
) {
  const sqlExtension = sql({
    defaultSchema: options?.defaultSchema,
    schema: options?.entities
      ? buildSchema(options.entities, options.defaultSchema)
      : undefined,
  });

  view.dispatch({
    effects: sqlCompartment.reconfigure([
      sqlExtension,
      // Add autocompletion support with our custom source
      sqlExtension.language.data.of({
        autocomplete: (context: CompletionContext) =>
          handleCompletionContext(context),
      }),
    ]),
  });
}

export function applyEntities(view: EditorView, entities: Entity[]) {
  view.dispatch({
    effects: setEntities.of(entities),
  });
}

export function applyColumnsGetter(
  view: EditorView,
  columnsGetter: ColumnsGetter
) {
  view.dispatch({
    effects: setColumnsGetter.of(columnsGetter),
  });
}

/**
 * Handle autocomplete context and provide column completions
 */
async function handleCompletionContext(
  context: CompletionContext
): Promise<CompletionResult> {
  const word = context.matchBefore(/\w*/);
  if (!word) return null;

  if (!context.state.field(columnsGetter)) {
    return null;
  }

  const analyzer = new SqlContextAnalyzer(
    context.state.field(entities),
    context.state.field(columnsGetter)
  );

  const cursor = context.pos;
  const doc = context.state.doc;

  // Check for dot completion (table.column)
  let columns: string[];

  const dotColumns = await analyzer.getDotCompletionColumns(
    context,
    cursor,
    doc
  );

  if (dotColumns) {
    columns = dotColumns;
  } else if (context.explicit) {
    let foundColumns = await analyzer.loadColumnsFromQueryContext(
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
