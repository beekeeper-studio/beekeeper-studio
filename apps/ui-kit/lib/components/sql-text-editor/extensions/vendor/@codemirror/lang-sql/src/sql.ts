import { SQLConfig as BaseSQLConfig, StandardSQL } from "@codemirror/lang-sql"
import { completeFromSchema, completionLevels, completeConfig, keywordCompletionSource,
         KeywordCasing, IdentifierQuoting } from "./complete"
import { Extension } from "@codemirror/state"
import { CompletionSource } from "@codemirror/autocomplete"
import { LanguageSupport } from "@codemirror/language"

export type SQLConfig = BaseSQLConfig & {
  /** How completed keywords are cased. Default "preserve": match typed case. */
  keywordCasing?: KeywordCasing
  /** When identifier completions get quoted. Default "auto": only when the dialect needs it. */
  quoteIdentifiers?: IdentifierQuoting
}

/// Returns a completion sources that provides schema-based completion
/// for the given configuration.
export function schemaCompletionSource(config: SQLConfig): CompletionSource {
  return config.schema ? completeFromSchema(config.schema, config.tables, config.schemas,
                                            config.defaultTable, config.defaultSchema,
                                            config.dialect || StandardSQL, config.quoteIdentifiers)
    : () => null
}

function schemaCompletion(config: SQLConfig): Extension {
  return config.schema ? [completionLevels, completeConfig.of({
    defaultTableName: config.defaultTable,
    defaultSchemaName: config.defaultSchema,
    dialect: config.dialect || StandardSQL,
    quoteIdentifiers: config.quoteIdentifiers,
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
