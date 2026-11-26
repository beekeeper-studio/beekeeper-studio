import { Extension } from "@codemirror/state";
import { TextEditor } from "../text-editor/TextEditor";
import { Entity } from "../types";
import { Dialect } from "sql-query-identifier";
import {
  applyDialect,
  applyEntities,
  applySplitQueriesByLine,
  extensions as sqlExtensions,
  SQLExtensionsConfig,
} from "./extensions";
import { LanguageId } from "../text-editor/types";
import { ExtensionConfiguration } from "@/components";
import { StandardSQL } from "@codemirror/lang-sql";
import { langIdToDialect } from "./customDialects";

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

  setLanguageId(languageId: LanguageId) {
    super.setLanguageId(languageId);
    applySplitQueriesByLine(this.view, languageId === "redis");
  }

  // --- Editor Setup ---

  /**
   * Get base extensions for the editor
   */
  protected getExtensions(config: ExtensionConfiguration): Extension[] {
    const baseExtensions = super.getExtensions(config);
    return [
      baseExtensions,
      sqlExtensions({
        ...this.extensionsConfig,
        dialect: langIdToDialect[config.languageId] || StandardSQL,
        // Redis scripts run one command per line
        splitQueriesByLine: config.languageId === "redis",
      }),
    ];
  }
}
