import { SQLConfig as BaseSQLConfig, StandardSQL } from "@codemirror/lang-sql"
import { completeFromSchema, completionLevels, completeConfig, keywordCompletionSource,
         KeywordCasing, IdentifierQuoting } from "./complete"
import { Extension } from "@codemirror/state"
import { CompletionSource } from "@codemirror/autocomplete"
import { LanguageSupport } from "@codemirror/language"

export type SQLConfig = BaseSQLConfig & {
  /** How completed keywords are cased. Default "preserve": follow the typed
   * prefix, uppercase when there is no prefix. */
  keywordCasing?: KeywordCasing
  /** When identifier completions get quoted. Default "auto": only when the dialect needs it. */
  quoteIdentifiers?: IdentifierQuoting
  /**
   * The quote character identifier completions are wrapped in, when quoting
   * happens. Honored only if the dialect recognizes it as an identifier quote
   * (e.g. `"` instead of `[` for SQL Server); otherwise the dialect's default
   * applies.
   */
  quoteCharacter?: string
}

/// Returns a completion sources that provides schema-based completion
/// for the given configuration.
export function schemaCompletionSource(config: SQLConfig): CompletionSource {
  return config.schema ? completeFromSchema(config.schema, config.tables, config.schemas,
                                            config.defaultTable, config.defaultSchema,
                                            config.dialect || StandardSQL, config.quoteIdentifiers,
                                            config.quoteCharacter)
    : () => null
}

function schemaCompletion(config: SQLConfig): Extension {
  return config.schema ? [completionLevels, completeConfig.of({
    defaultTableName: config.defaultTable,
    defaultSchemaName: config.defaultSchema,
    dialect: config.dialect || StandardSQL,
    quoteIdentifiers: config.quoteIdentifiers,
    quoteCharacter: config.quoteCharacter,
  }), (config.dialect || StandardSQL).language.data.of({
    autocomplete: schemaCompletionSource(config)
  })] : []
}

/// SQL language support for the given SQL dialect, with keyword
/// completion, and, if provided, schema-based completion as extra
/// extensions.
export function sql(config: SQLConfig = {}) {
  let lang = config.dialect || StandardSQL
  // upperCaseKeywords predates keywordCasing (upstream option); keep honoring it.
  let casing = config.keywordCasing || (config.upperCaseKeywords ? "upper" : "preserve")
  return new LanguageSupport(lang.language, [
    schemaCompletion(config),
    lang.language.data.of({
      autocomplete: keywordCompletionSource(lang, casing, config.keywordCompletion)
    })
  ])
}
