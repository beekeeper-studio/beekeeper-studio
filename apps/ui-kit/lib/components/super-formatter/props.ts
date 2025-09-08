// import { Entity } from "../types";
import { PropType } from "vue"
import { FormatOptions } from "sql-formatter"
// import { Options } from "sql-query-identifier";
// import props from "../text-editor/props";

export default {
  value: String,
  canAddPresets: Boolean,
  clipboard: Function,
  defaultPreset: {
    type: Object,
    default: () => ({
      tabWidth: 2,
      useTabs: false,
      keywordCase: 'preserve',
      dataTypeCase: 'preserve',
      functionCase: 'preserve',
      logicalOperatorNewline: 'before',
      expressionWidth: 50,
      linesBetweenQueries: 1,
      denseOperators: false,
      newlineBeforeSemicolon: false
    })
  },
  presets: {
    type: Array,
    default: () => []
  },
  formatterDialect: {
    type: String as PropType<FormatOptions["language"]>,
    default: "sql",
  }
}
