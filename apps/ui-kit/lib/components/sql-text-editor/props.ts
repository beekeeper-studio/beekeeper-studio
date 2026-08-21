import { Entity } from "../types";
import { PropType } from "vue";
import { DialectOptions, FormatOptions, FormatOptionsWithLanguage } from "sql-formatter";
import { Options } from "sql-query-identifier";
import props from "../text-editor/props";
import { KeywordCasing, IdentifierQuoting } from "./extensions";

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
  // Optional: custom sql-formatter dialect (e.g. PartiQL) taking precedence
  // over `formatterDialect`. When set, formatDialect() is used.
  formatterDialectOptions: {
    type: Object as PropType<DialectOptions | null>,
    default: null,
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
  /**
   * Casing of completed keywords and built-in functions. "preserve" follows
   * the typed prefix (SEL -> SELECT, sel -> select; uppercase when there is
   * no prefix); "upper"/"lower" force one case.
   */
  keywordCasing: {
    type: String as PropType<KeywordCasing>,
    default: "preserve",
  },
  /**
   * When completed identifiers get quoted. "auto" quotes only names the
   * dialect can't reference bare; "always" also quotes anything that isn't
   * all-lowercase.
   */
  quoteIdentifiers: {
    type: String as PropType<IdentifierQuoting>,
    default: "auto",
  },
  /**
   * The quote character used when completions quote an identifier. Honored
   * only if the dialect recognizes it as an identifier quote (e.g. `"`
   * instead of `[` for SQL Server); otherwise the dialect's default applies.
   */
  quoteCharacter: {
    type: String,
    default: undefined,
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
