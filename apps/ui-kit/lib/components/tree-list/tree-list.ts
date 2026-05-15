import { PropType } from "vue";
import { TreeItem } from "./types";

export const props = {
  /** The tree of items to render. Each item is either a folder (with children)
   * or a leaf item. */
  list: {
    type: Array as PropType<TreeItem[]>,
    default: () => [],
  },
};
