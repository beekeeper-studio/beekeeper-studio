import { Entity } from "../types";
import { SortByValues } from "./models";

export interface EntityListEventMap extends HTMLElementEventMap {
  "bks-refresh-btn-click": CustomEvent;
  "bks-entity-unhide": CustomEvent;
  "bks-entity-dblclick": CustomEvent<{ entity: Entity }>;
  "bks-pinned-entities-sort-by": CustomEvent<{
    sortBy: (typeof SortByValues)[number];
  }>;
  "bks-pinned-entities-sort-order": CustomEvent;
  "bks-pinned-entities-sort-position": CustomEvent<{ entities: Entity[] }>;
  "bks-entities-request-columns": CustomEvent<{ entities: Entity[] }>;
  "bks-entity-contextmenu": CustomEvent<{ entity: Entity }>;
  "bks-entity-pin": CustomEvent<{ entity: Entity }>;
  "bks-entity-unpin": CustomEvent<{ entity: Entity }>;
  "bks-expand-all": CustomEvent;
  "bks-collapse-all": CustomEvent;
}
