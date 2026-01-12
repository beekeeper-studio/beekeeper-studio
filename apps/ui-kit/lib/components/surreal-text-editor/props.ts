import { PropType } from "vue";
import { Entity } from "../types";

export default {
  entities: {
    type: Array as PropType<Entity[]>,
    default() {
      return [];
    }
  },
  columnsGetter: Function,
  allowPresets: {
    type: Boolean,
    default: false
  },
  presets: {
    type: Array,
    default: () => []
  },
  formatterConfig: {
    type: Object,
    default: () => ({})
  },
}
