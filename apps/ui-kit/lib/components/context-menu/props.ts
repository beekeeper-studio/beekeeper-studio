import { PropType } from "vue";
import { MenuItem } from "./menu";

const props = {
  options: {
    type: Array as PropType<MenuItem[]>,
    default: () => [],
  },
  event: {
    type: Event,
    required: true,
  },
  item: null as unknown as PropType<unknown>,
  targetElement: String,
};

export default props;
