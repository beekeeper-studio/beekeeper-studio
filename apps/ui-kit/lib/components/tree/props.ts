import { PropType } from "vue";
import { FolderNode, ItemNode } from "./types";

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
  filter: {
    type: String,
    default: "",
  },
};

export default props;
