import { FormatOptions } from "sql-formatter";
import { Options } from "sql-query-identifier";
import { PropType } from "vue/types/v3-component-props";
import textEditorMixin from "../text-editor/mixin";
import { Entity } from "../types";

export const props = {
  mode: {
    type: textEditorMixin.props.mode,
    default: "text/x-sql",
  },
  hint: {
    type: textEditorMixin.props.hint,
    default: "sql",
  },
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
  formatterDialect: {
    type: String as PropType<FormatOptions["language"]>,
    default: "sql",
  },
  identifierDialect: {
    type: String as PropType<Options["dialect"]>,
    default: "generic",
  },
};
