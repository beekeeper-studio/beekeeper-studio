import { Entity } from "../../types";
import { PropType } from "vue";
import { FormatOptions } from "sql-formatter";
import { Options } from "sql-query-identifier";
import props from "../../text-editor/v2/props";

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
    type: String as PropType<FormatOptions["language"]>,
    default: "sql",
  },
  identifierDialect: {
    type: String as PropType<Options["dialect"]>,
    default: "generic",
  },
  languageId: {
    type: props.languageId.type,
    default: "sql",
  },

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
