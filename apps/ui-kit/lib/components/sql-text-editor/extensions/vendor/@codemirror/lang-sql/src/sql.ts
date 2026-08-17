import { keywordCompletionSource, SQLConfig, StandardSQL } from "@codemirror/lang-sql"
import { completeFromSchema, completionLevels, completeConfig } from "./complete"
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
  return config.schema ? [completionLevels, completeConfig.of({
    defaultTableName: config.defaultTable,
    defaultSchemaName: config.defaultSchema,
    dialect: config.dialect || StandardSQL,
  }), (config.dialect || StandardSQL).language.data.of({
    autocomplete: schemaCompletionSource(config)
  })] : []
}

/// SQL language support for the given SQL dialect, with keyword
/// completion, and, if provided, schema-based completion as extra
/// extensions.
///
/// The `disableSchemaCompletion` and `disableKeywordCompletion` flags (custom
/// extensions to SQLConfig) allow callers to turn off either completion source
/// entirely. This is useful as a workaround for performance issues on very
/// large schemas (see beekeeper-studio issue #4492).
export function sql(config: SQLConfig = {}) {
  let lang = config.dialect || StandardSQL
  const extensions: Extension[] = []
  if (!(config as any).disableSchemaCompletion) {
    extensions.push(schemaCompletion(config))
  }
  if (!(config as any).disableKeywordCompletion) {
    extensions.push(lang.language.data.of({
      autocomplete: keywordCompletionSource(lang, config.upperCaseKeywords, config.keywordCompletion)
    }))
  }
  return new LanguageSupport(lang.language, extensions)
}

