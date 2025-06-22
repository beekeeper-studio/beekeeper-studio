import { TextEditorEventMap } from "../../text-editor";
import type { QuerySelectionChangeParams } from "./extensions";

export interface SqlTextEditorEventMap extends TextEditorEventMap {
  "bks-query-selection-change": QuerySelectionChangeParams;
}
