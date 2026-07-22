import { PropType } from "vue";
import { Folder } from "./types";

const props = {
  folders: {
    type: Array as PropType<Folder[]>,
    default: () => [],
  },
  items: {
    type: Array as PropType<unknown[]>,
    default: () => [],
  },
  itemParentKey: String,
  expandedFolderIds: {
    type: Array as PropType<number[]>,
    required: true,
  },
  draggable: {
    type: Boolean,
    default: false,
  },
  undraggableFolderIds: {
    type: Array as PropType<number[]>,
    default: () => [],
  },
};

export default props;
