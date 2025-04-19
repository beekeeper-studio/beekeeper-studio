import { Compartment, Extension } from "@codemirror/state";
import { TextEditor } from "../../text-editor/v2/TextEditor";
import { sql, SQLConfig } from "@codemirror/lang-sql";
import { Entity } from "../../types";
import { CompletionContext, CompletionResult } from "@codemirror/autocomplete";
import { SQLContextAnalyzer } from "./SQLContextAnalyzer";
import { buildSchema, columnsToCompletions } from "./utils";

export interface CompletionSource {
  defaultSchema?: string;
  entities: Entity[];
}

type RequestColumnsListener = (entity: Entity) => string[] | Promise<string[]>;

export class SqlTextEditor extends TextEditor {
  sqlCompartment: Compartment = new Compartment();
  columnCompletionCompartment: Compartment = new Compartment();
  entities: Entity[] = [];
  sqlContextAnalyzer: SQLContextAnalyzer;

  // --- Public API ---

  /**
   * Sets the completion source with entities and schema information
   */
  setCompletionSource(completionSource: CompletionSource) {
    this.entities = completionSource.entities;
    if (this.sqlContextAnalyzer) {
      this.sqlContextAnalyzer.setEntities(completionSource.entities);
    }

    this.view.dispatch({
      effects: this.sqlCompartment.reconfigure(
        this.createSqlExtension({
          defaultSchema: completionSource.defaultSchema,
          schema: buildSchema(
            completionSource.entities,
            completionSource.defaultSchema
          ),
        })
      ),
    });
  }

  /**
   * Sets the listener that will be called to fetch columns for a table
   */
  setRequestColumnsListener(listener?: RequestColumnsListener) {
    if (listener) {
      this.sqlContextAnalyzer = new SQLContextAnalyzer(this.entities, listener);
    } else {
      this.sqlContextAnalyzer = null;
    }
  }

  // --- Editor Setup ---

  /**
   * Get base extensions for the editor
   */
  protected getBaseExtensions(): Extension[] {
    const baseExtensions = super.getBaseExtensions();
    return [
      ...baseExtensions,
      this.sqlCompartment.of([this.createSqlExtension()]),
    ];
  }

  /**
   * Create SQL language extension with autocomplete support
   */
  private createSqlExtension(config?: SQLConfig): Extension {
    const sqlExtension = sql(config);
    return [
      sqlExtension,
      // Add autocompletion support with our custom source
      sqlExtension.language.data.of({
        autocomplete: (context: CompletionContext) =>
          this.handleCompletionContext(context),
      }),
    ];
  }

  // --- Autocomplete Handling ---

  /**
   * Handle autocomplete context and provide column completions
   */
  private async handleCompletionContext(
    context: CompletionContext
  ): Promise<CompletionResult> {
    if (!this.sqlContextAnalyzer) {
      return;
    }

    const cursor = context.pos;
    const doc = context.state.doc;

    // Check for dot completion (table.column)
    let columns: string[]

    const dotColumns = await this.sqlContextAnalyzer.getDotCompletionColumns(context, cursor, doc)

    if (dotColumns) {
      columns = dotColumns
    } else if (context.explicit) {
      let foundColumns = await this.sqlContextAnalyzer.loadColumnsFromQueryContext(context.state, cursor)
      if (foundColumns) {
        columns = foundColumns
      }
    }

    if (columns && columns.length) {
      return {
        from: cursor,
        options: columnsToCompletions(columns),
      };
    }

    return null;
  }
}
