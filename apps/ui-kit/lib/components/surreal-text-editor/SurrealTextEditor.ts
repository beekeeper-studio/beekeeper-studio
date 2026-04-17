import { Extension } from "@codemirror/state";
import { ExtensionConfiguration } from "../text-editor";
import { TextEditor } from "../text-editor/TextEditor";
import { extensions as surrealExtensions } from "./extensions";
import { CompletionSource } from "../sql-text-editor/SqlTextEditor";
import { applyEntities, SQLExtensionsConfig } from "../sql-text-editor/extensions";

export class SurrealTextEditor extends TextEditor {
  private extensionsConfig: SQLExtensionsConfig;

  constructor(extensionsConfig?: SQLExtensionsConfig) {
    super();
    this.extensionsConfig = {
      identiferDialect: "generic",
      onQuerySelectionChange: () => {},
      schema: {},
      ...extensionsConfig
    }
  }

  setCompletionSource(completionSource: CompletionSource) {
    applyEntities(
      this.view,
      completionSource.entities,
      completionSource.defaultSchema
    );
  }

  protected getExtensions(config: ExtensionConfiguration): Extension[] {

    const baseExtensions = super.getExtensions({...config, languageId: undefined});
    return [
      baseExtensions,
      surrealExtensions(this.extensionsConfig),
    ]
  }
}
