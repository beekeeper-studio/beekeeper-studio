import { Extension } from "@codemirror/state";
import { ExtensionConfiguration } from "../text-editor";
import { TextEditor } from "../text-editor/TextEditor";
import { extensions as surrealExtensions } from "./extensions";
import { CompletionSource } from "../sql-text-editor/SqlTextEditor";
import { applyColumnsGetter, applyEntities, applySqlExtension, ColumnsGetter } from "../sql-text-editor/extensions";

export class SurrealTextEditor extends TextEditor {
  // possibly pass in config for extensions
  //

  setCompletionSource(completionSource: CompletionSource) {
    applyEntities(this.view, completionSource.entities);
    applySqlExtension(this.view, {
      entities: completionSource.entities
    });
  }

  setRequestColumnsListener(listener?: ColumnsGetter) {
    applyColumnsGetter(this.view, listener);
  }

  protected getExtensions(config: ExtensionConfiguration): Extension[] {

    const baseExtensions = super.getExtensions({...config, languageId: undefined});
    return [
      baseExtensions,
      surrealExtensions(),
    ]
  }
}
