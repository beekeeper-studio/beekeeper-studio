import { PropType } from "vue"
import { FormatOptions } from "sql-formatter"

export default {
  value: String,
  canAddPresets: Boolean,
  clipboard: Object,
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
