import { PropType } from "vue";
import { Entity } from "../types";
import { CustomMenuItems } from "../context-menu/menu";

export const SortByValues = ["position", "name"] as const;
type SortByType = typeof SortByValues[number];

export const props = {
  /** List of entities to display in the sidebar */
  entities: {
    type: Array as PropType<Entity[]>,
    default: () => [],
  },
  /** List of hidden entities */
  hiddenEntities: {
    type: Array as PropType<Entity[]>,
    default: () => [],
  },
  /** List of pinned entities */
  pinnedEntities: {
    type: Array as PropType<Entity[]>,
    default: () => [],
  },
  /** Enable entity pinning functionality */
  enablePinning: {
    type: Boolean,
    default: false,
  },
  /** Sort property for pinned entities */
  pinnedSortBy: {
    type: String as PropType<SortByType>,
    default: "position",
  },
  /** Sort order for pinned entities */
  pinnedSortOrder: {
    type: String,
    default: "asc",
  },
  /** Custom context menu items */
  contextMenuItems: [Array, Function] as PropType<CustomMenuItems>,
  /** Show create entity button */
  showCreateEntityBtn: {
    type: Boolean,
    default: true,
  },
};