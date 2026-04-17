import { PropType } from "vue"
import { FormatOptions, FormatOptionsWithLanguage } from "sql-formatter"

export default {
  value: String,
  canAddPresets: Boolean,
  clipboard: Object as PropType<Clipboard>,
  startingPreset: {
    type: Object as PropType<FormatOptions>,
    default: () => ({
      id: null,
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
    type: String as PropType<FormatOptionsWithLanguage["language"]>,
    default: "sql",
  }
}
