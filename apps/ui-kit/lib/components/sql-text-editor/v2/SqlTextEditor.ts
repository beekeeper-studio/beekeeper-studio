import { Compartment, Extension } from "@codemirror/state";
import { TextEditor } from "../../text-editor/v2/TextEditor";
import { Entity } from "../../types";
import { SqlContextAnalyzer } from "./SqlContextAnalyzer";
import { buildSchema } from "./utils";
import { removeQueryQuotesExtension } from "./extensions/removeQueryQuotes";
import { Dialect } from "sql-query-identifier";
import { setSqlContextAnalyzer, sqlExtension } from "./extensions/sql";
import { triggerAutocompleteExtension } from "./extensions/triggerAutocomplete";

export interface CompletionSource {
  defaultSchema?: string;
  entities: Entity[];
}

type RequestColumnsListener = (entity: Entity) => string[] | Promise<string[]>;

export class SqlTextEditor extends TextEditor {
  sqlCompartment = new Compartment();
  removeQueryQuotesCompartment = new Compartment();
  columnCompletionCompartment = new Compartment();
  entities: Entity[] = [];
  sqlContextAnalyzer?: SqlContextAnalyzer;

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
        sqlExtension({
          defaultSchema: completionSource.defaultSchema,
          schema: buildSchema(
            completionSource.entities,
            completionSource.defaultSchema
          ),
        })
      ),
    });
  }

  setQueryIdentifierDialect(dialect: Dialect) {
    this.view.dispatch({
      effects: this.removeQueryQuotesCompartment.reconfigure(
        removeQueryQuotesExtension(dialect)
      ),
    });
  }

  /**
   * Sets the listener that will be called to fetch columns for a table
   */
  setRequestColumnsListener(listener?: RequestColumnsListener) {
    if (listener) {
      this.sqlContextAnalyzer = new SqlContextAnalyzer(this.entities, listener);
    } else {
      this.sqlContextAnalyzer = null;
    }

    this.view.dispatch({
      effects: setSqlContextAnalyzer.of(this.sqlContextAnalyzer),
    });
  }

  // --- Editor Setup ---

  /**
   * Get base extensions for the editor
   */
  protected getBaseExtensions(): Extension[] {
    const baseExtensions = super.getBaseExtensions();
    return [
      ...baseExtensions,
      this.sqlCompartment.of([sqlExtension()]),
      this.removeQueryQuotesCompartment.of([]),
      triggerAutocompleteExtension(),
    ];
  }
}
