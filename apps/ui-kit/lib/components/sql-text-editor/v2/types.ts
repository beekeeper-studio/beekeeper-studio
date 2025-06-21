import { TextEditorEventMap } from "../../text-editor";
import { QuerySelectionChangeParams } from "./extensions";

export interface SqlTextEditorEventMap extends TextEditorEventMap {
  "bks-query-selection-change": QuerySelectionChangeParams;
}
