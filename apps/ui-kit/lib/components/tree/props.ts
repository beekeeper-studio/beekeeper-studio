import { PropType } from "vue";
import { FolderNode, ItemNode, Node } from "./types";

const props = {
  folders: {
    type: Array as PropType<FolderNode[]>,
    default: () => [],
  },
  items: {
    type: Array as PropType<ItemNode[]>,
    default: () => [],
  },
  expandedIds: {
    type: Array as PropType<FolderNode["id"][]>,
    required: true,
  },
  selectedIds: {
    type: Array as PropType<Node["id"][]>,
    default: undefined,
  },
  filter: {
    type: String,
    default: "",
  },
};

export default props;
