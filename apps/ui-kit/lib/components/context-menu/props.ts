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
  /** Title shown at the top of the menu */
  heading: String,
  /** Extra class on the menu, for styling one menu without affecting the rest */
  menuClass: String,
};

export default props;
