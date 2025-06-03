import { SqlTextEditorElement } from ".";
import CodeMirror from "codemirror";

window.customElements.define("bks-sql-text-editor", SqlTextEditorElement);

declare module "codemirror" {
  interface Editor {
    lastCompletionState?: {
      token: string;
      from: Position;
      to: Position;
      list: any[];
      picked?: boolean;
    };
  }
}
