import { keywordCompletionSource, SQLConfig, StandardSQL } from "@codemirror/lang-sql"
import { completeFromSchema } from "./complete"
import { Extension } from "@codemirror/state"
import { CompletionSource } from "@codemirror/autocomplete"
import { LanguageSupport } from "@codemirror/language"

/// Returns a completion sources that provides schema-based completion
/// for the given configuration.
export function schemaCompletionSource(config: SQLConfig): CompletionSource {
  return config.schema ? completeFromSchema(config.schema, config.tables, config.schemas,
                                            config.defaultTable, config.defaultSchema,
                                            config.dialect || StandardSQL)
    : () => null
}

function schemaCompletion(config: SQLConfig): Extension {
  return config.schema ? (config.dialect || StandardSQL).language.data.of({
    autocomplete: schemaCompletionSource(config)
  }) : []
}

/// SQL language support for the given SQL dialect, with keyword
/// completion, and, if provided, schema-based completion as extra
/// extensions.
export function sql(config: SQLConfig = {}) {
  let lang = config.dialect || StandardSQL
  return new LanguageSupport(lang.language, [
    schemaCompletion(config),
    lang.language.data.of({
      autocomplete: keywordCompletionSource(lang, config.upperCaseKeywords, config.keywordCompletion)
    })
  ])
}

