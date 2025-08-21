import { Extension } from "@codemirror/state";
import { TextEditor } from "../text-editor/TextEditor";
import { Entity } from "../types";
import { Dialect } from "sql-query-identifier";
import {
  applyDialect,
  applyEntities,
  extensions as sqlExtensions,
  SQLExtensionsConfig,
} from "./extensions";
import { ExtensionConfiguration } from "../text-editor/types";

export interface CompletionSource {
  defaultSchema?: string;
  entities: Entity[];
}

export class SqlTextEditor extends TextEditor {
  private extensionsConfig: SQLExtensionsConfig;

  constructor(extensionsConfig?: SQLExtensionsConfig){
    super();
    this.extensionsConfig = {
      identiferDialect: "generic",
      onQuerySelectionChange: () => {},
      // HACK: always turn on schema completion
      schema: {},
      ...extensionsConfig,
    };
  }

  // --- Public API ---

  /**
   * Sets the completion source with entities and schema information
   */
  setCompletionSource(completionSource: CompletionSource) {
    applyEntities(
      this.view,
      completionSource.entities,
      completionSource.defaultSchema
    );
  }

  setQueryIdentifierDialect(dialect: Dialect) {
    applyDialect(this.view, dialect);
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
