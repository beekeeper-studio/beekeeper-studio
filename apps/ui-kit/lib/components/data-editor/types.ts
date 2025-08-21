import { EntityListEventMap } from "../entity-list";
import { SqlTextEditorEventMap } from "../sql-text-editor";
import { TableEventMap } from "../table";
import { TableEntity, BaseData } from "../types";

export interface Table extends TableEntity {
  data: BaseData;
}

export type QuerySubmitEvent = CustomEvent<{ query: string }>;

// FIXME: bks-initialized event should be emitted by data editor element
export interface DataEditorEventMap
  extends Omit<SqlTextEditorEventMap, "bks-initialized">,
    EntityListEventMap,
    Omit<TableEventMap, "bks-initialized"> {
  "bks-query-submit": QuerySubmitEvent;
}
