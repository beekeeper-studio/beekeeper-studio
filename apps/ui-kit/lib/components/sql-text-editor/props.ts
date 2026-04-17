import { Entity } from "../types";
import { PropType } from "vue";
import { FormatOptions, FormatOptionsWithLanguage } from "sql-formatter";
import { Options } from "sql-query-identifier";
import props from "../text-editor/props";

export default {
  /** Entities for autocompletion */
  entities: {
    type: Array as PropType<Entity[]>,
    default() {
      return [];
    },
  },
  defaultSchema: {
    type: String,
    default: "public",
  },
  columnsGetter: Function,
  formatterDialect: {
    type: String as PropType<FormatOptionsWithLanguage["language"]>,
    default: "sql",
  },
  formatterConfig: {
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
  identifierDialect: {
    type: String as PropType<Options["dialect"]>,
    default: "generic",
  },
  paramTypes: {
    type: Object as PropType<Options["paramTypes"]>,
  },
  languageId: {
    type: props.languageId.type,
    default: "sql",
  },
  allowPresets: {
    type: Boolean,
    default: false
  },
  presets: {
    type: Array,
    default: () => []
  },
  formatterModalId: {
    type: String,
    default: ''
  }

  // --- replaced with languageId
  // mode: {
  //   type: textEditorMixin.props.mode,
  //   default: "text/x-sql",
  // },
  // hint: {
  //   type: textEditorMixin.props.hint,
  //   default: "sql",
  // },
  // ----------
  //
};
