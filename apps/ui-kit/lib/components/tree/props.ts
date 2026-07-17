import { PropType } from "vue";
import { Folderable } from "./types";

const props = {
  folders: {
    type: Array as PropType<Folderable[]>,
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
};

export default props;
