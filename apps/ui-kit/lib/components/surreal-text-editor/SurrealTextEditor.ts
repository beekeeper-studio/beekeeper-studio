import { Extension } from "@codemirror/state";
import { ExtensionConfiguration } from "../text-editor";
import { TextEditor } from "../text-editor/v2/TextEditor";
import { extensions as surrealExtensions } from "./extensions";

export class SurrealTextEditor extends TextEditor {
  // possibly pass in config for extensions

  protected getExtensions(config: ExtensionConfiguration): Extension[] {

    const baseExtensions = super.getExtensions({...config, languageId: undefined});
    return [
      baseExtensions,
      surrealExtensions(),
    ]
  }
}
