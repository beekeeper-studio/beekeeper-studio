import { Extension } from "@codemirror/state";
import { TextEditor } from "../text-editor/TextEditor";
import { Entity } from "../types";
import { Dialect } from "sql-query-identifier";
import {
  applySqlExtension,
  applyDialect,
  applyEntities,
  applyColumnsGetter,
  extensions as sqlExtensions,
  ColumnsGetter,
  SQLExtensionsConfig,
} from "./extensions";
import { ExtensionConfiguration } from "../text-editor/types";

export interface CompletionSource {
  defaultSchema?: string;
  entities: Entity[];
}

export class SqlTextEditor extends TextEditor {
  constructor(private extensionsConfig: SQLExtensionsConfig){
    super();
  }

  // --- Public API ---

  /**
   * Sets the completion source with entities and schema information
   */
  setCompletionSource(completionSource: CompletionSource) {
    applyEntities(this.view, completionSource.entities);
    applySqlExtension(this.view, {
      defaultSchema: completionSource.defaultSchema,
      entities: completionSource.entities,
    });
  }

  setQueryIdentifierDialect(dialect: Dialect) {
    applyDialect(this.view, dialect);
  }

  /**
   * Sets the listener that will be called to fetch columns for a table
   */
  setRequestColumnsListener(listener?: ColumnsGetter) {
    applyColumnsGetter(this.view, listener);
  }

  // --- Editor Setup ---

  /**
   * Get base extensions for the editor
   */
  protected getExtensions(config: ExtensionConfiguration): Extension[] {
    const baseExtensions = super.getExtensions(config);
    return [
      baseExtensions,
      sqlExtensions(this.extensionsConfig),
    ];
  }
}
