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
  itemParentKey: {
    type: String,
    required: true,
  },
};

export default props;
