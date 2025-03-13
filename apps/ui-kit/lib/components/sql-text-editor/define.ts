import { SqlTextEditor } from ".";
import CodeMirror from "codemirror";

window.customElements.define("bks-sql-text-editor", SqlTextEditor);

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
