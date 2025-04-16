import { SqlTextEditorElement } from ".";
import CodeMirror from "codemirror";

window.customElements.define("bks-sql-text-editor", SqlTextEditorElement);

declare global {
  interface HTMLElementTagNameMap {
    "bks-sql-text-editor": typeof SqlTextEditorElement;
  }
}

declare module "codemirror" {
  interface Editor {
    lastCompletionState?: {
      token: string;
      from: CodeMirror.Position;
      to: CodeMirror.Position;
      list: any[];
      picked?: boolean;
    };
  }
}
