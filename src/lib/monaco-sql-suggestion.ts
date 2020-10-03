import _ from 'lodash';
import * as monaco from 'monaco-editor';
import * as NodeSQLParser from 'node-sql-parser'

type tableMap = {
  [table: string]: string[]
}

function wrapIdentifier(databaseType: string, value: string) {
  if (value && databaseType === 'postgresql' && /[A-Z]/.test(value)) {
    return `"${value.replace(/^"|"$/g, '')}"`
  }
  return value;
}

function getUserQueryColumnsFromAST(queryAST?: NodeSQLParser.AST) {
  return queryAST?.type === 'select' && queryAST.columns instanceof Array
    ? (queryAST.columns as NodeSQLParser.Column[])
      .map(c => (!c.as && c.expr.type === 'column_ref') ? c.expr.column : undefined)
      .filter(c => !!c)
    : []
}

export const sqlMonacoDotSuggestion = (databaseType: string, queryUntilCursor: string, range: monaco.Range, databaseTables: tableMap, queryAST?: NodeSQLParser.AST) => {
  const tablesName = queryAST?.type === 'select' && queryAST.from
    ? queryAST.from.filter(f => !!f).map((f) => (f as NodeSQLParser.From).table)
    : []

  const queryTableName = (_.last(queryUntilCursor.match(/[a-zA-Z_']+(?=\.)/)) || '').replace(/'/g, '')
  const tableAliasMap: Map<string, string> = queryAST?.type === 'select' && queryAST.from
    ? new Map(queryAST.from.filter(f => !!f).map((f) => [(f as NodeSQLParser.From).as, (f as NodeSQLParser.From).table]))
    : new Map();

  const tableName = tableAliasMap.get(queryTableName) || queryTableName

  if (tablesName.includes(tableName)) {
    return {
      suggestions: tablesName.flatMap(tableName => databaseTables[tableName].map((columnName: string) => ({
        label: `${tableName}.${columnName}`,
        insertText: wrapIdentifier(databaseType, columnName),
        kind: monaco.languages.CompletionItemKind.Field,
        range: range
      })))
    }
  }

  return {
    suggestions: []
  }
}

export const sqlMonacoSuggestion = (databaseType: string, queryUntilCursor: string, range: monaco.Range, databaseTables: tableMap, queryAST?: NodeSQLParser.AST) => {
  const tablesName = queryAST?.type === 'select' && queryAST.from
    ? queryAST.from.filter(f => !!f).map((f) => (f as NodeSQLParser.From).table)
    : []

  if (!queryUntilCursor.trim()) {
    return {
      suggestions: [{
        label: 'select * from $1',
        kind: monaco.languages.CompletionItemKind.Snippet,
        insertText: 'select ${0:*} from $1',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'SELECT Statement',
        range,
      }]
    }
  } else if (queryUntilCursor.endsWith("from ")) {
    return {
      suggestions: Object.keys(databaseTables).map(tableName => ({
        label: tableName,
        insertText: `${wrapIdentifier(databaseType, tableName)} `,
        kind: monaco.languages.CompletionItemKind.Field,
        range,
      }))
    }
  } else if (queryUntilCursor.endsWith(", ")) {
    const usedColumns = getUserQueryColumnsFromAST(queryAST)

    return {
      suggestions: tablesName.flatMap(tableName => databaseTables[tableName].filter(columnName => !usedColumns.includes(columnName)).map(columnName => ({
        label: columnName,
        insertText: wrapIdentifier(databaseType, columnName),
        kind: monaco.languages.CompletionItemKind.Field,
        range,
      })))
    }
  } else if (
    queryUntilCursor.endsWith("where ") || queryUntilCursor.endsWith("and ") || queryUntilCursor.endsWith("or ")
    || queryUntilCursor.endsWith("select ") || queryUntilCursor.endsWith("order by ")
  ) {
    return {
      suggestions: tablesName.flatMap(tableName => databaseTables[tableName].map((columnName: string) => ({
        label: columnName,
        insertText: wrapIdentifier(databaseType, columnName),
        kind: monaco.languages.CompletionItemKind.Field,
        range,
      })))
    }
  } else if (!queryAST) {
    return {
      suggestions: [{
        label: 'select',
        insertText: 'select',
        kind: monaco.languages.CompletionItemKind.Keyword,
        range: range
      }]
    }
  } else if (queryAST?.type === 'select' && !queryAST.from) {
    return {
      suggestions: [{
        label: 'from',
        insertText: 'from ',
        kind: monaco.languages.CompletionItemKind.Keyword,
        range,
      }]
    }
  } else if (queryAST?.type === 'select' && !queryAST.where) {
    return {
      suggestions: [{
        label: 'where',
        insertText: 'where ',
        kind: monaco.languages.CompletionItemKind.Keyword,
        range,
      }]
    }
  } else {
    return {
      suggestions: [{
        label: 'order by',
        insertText: 'order by ',
        kind: monaco.languages.CompletionItemKind.Keyword,
        range,
      }]
    }
  }
}
