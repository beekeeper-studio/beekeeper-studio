import { TextEditorEventMap, TextEditorMenuContext } from "../text-editor";
import type { QuerySelectionChangeParams } from "./extensions";

export interface SqlTextEditorEventMap extends TextEditorEventMap {
  "bks-query-selection-change": QuerySelectionChangeParams;
}

export type SqlTextEditorMenuContext = TextEditorMenuContext & {
  selectedQuery: string;
}
