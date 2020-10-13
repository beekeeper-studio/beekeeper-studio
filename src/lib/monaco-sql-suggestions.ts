import _ from 'lodash';
import * as monaco from 'monaco-editor';
import * as NodeSQLParser from 'node-sql-parser'
import { IDbClients } from './db/client';
import { sqlDotSuggestion, sqlSuggestion, SQLSuggestionKind } from './sql-suggestions';

type CompletionItem = monaco.languages.CompletionItem

interface SQLCompletionItem extends Omit<CompletionItem, 'range' | 'kind'> {
  kind: SQLSuggestionKind
}

type tableMap = {
  [table: string]: string[]
}

const mapSQLSuggestionKindToMonacoSuggestionKind = (sqlSuggestionKind: SQLSuggestionKind) => {
  switch (sqlSuggestionKind) {
    case SQLSuggestionKind.Statement:
      return monaco.languages.CompletionItemKind.Snippet
    case SQLSuggestionKind.Clause:
    case SQLSuggestionKind.Command:
      return monaco.languages.CompletionItemKind.Keyword
    default:
      return monaco.languages.CompletionItemKind.Field
  }
}

export const sqlMonacoDotSuggestion = (databaseType: IDbClients, queryUntilCursor: string, range: monaco.Range, databaseTables: tableMap, queryAST?: NodeSQLParser.AST) => {
  const suggestions: SQLCompletionItem[] = sqlDotSuggestion(databaseType, queryUntilCursor, databaseTables, queryAST).suggestions

  return {
    suggestions: suggestions.map(s => ({
      ...s,
      kind: mapSQLSuggestionKindToMonacoSuggestionKind(s.kind),
      insertTextRules: s.kind === SQLSuggestionKind.Statement
        ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
        : undefined,
      range,
    }))
  }
}

export const sqlMonacoSuggestion = (databaseType: IDbClients, queryUntilCursor: string, range: monaco.Range, databaseTables: tableMap, queryAST?: NodeSQLParser.AST) => {
  const suggestions: SQLCompletionItem[] = sqlSuggestion(databaseType, queryUntilCursor, databaseTables, queryAST).suggestions

  return {
    suggestions: suggestions.map((s) => ({
      ...s,
      kind: mapSQLSuggestionKindToMonacoSuggestionKind(s.kind),
      insertTextRules: s.kind === SQLSuggestionKind.Statement
        ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
        : undefined,
      range,
    }))
  }
}
