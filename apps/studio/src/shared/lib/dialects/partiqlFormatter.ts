// Custom sql-formatter v15 dialect for DynamoDB's PartiQL. sql-formatter has no
// built-in PartiQL language, but v15 exposes a `formatDialect(sql, { dialect })`
// API that accepts an inline DialectOptions object. We model the shape on the
// Trino dialect (closest SQL++ relative) but strip out Trino-specific features
// and add PartiQL-specific forms like `VALUE` and `MISSING`.
import { DialectOptions, expandPhrases } from 'sql-formatter'

const reservedSelect = expandPhrases(['SELECT [ALL | DISTINCT]'])

const reservedClauses = expandPhrases([
  // query clauses
  'FROM',
  'WHERE',
  'GROUP BY',
  'HAVING',
  'ORDER BY',
  'LIMIT',
  'OFFSET',
  'UNION [ALL | DISTINCT]',
  // data manipulation
  'INSERT INTO',
  'VALUE',
  'VALUES',
  'SET',
  'UPDATE',
  'DELETE FROM',
  'RETURNING',
])

const onelineClauses = expandPhrases([
  'CREATE TABLE [IF NOT EXISTS]',
  'DROP TABLE [IF EXISTS]',
  'ALTER TABLE [IF EXISTS]',
])

const reservedSetOperations = expandPhrases([
  'UNION [ALL | DISTINCT]',
  'EXCEPT [ALL | DISTINCT]',
  'INTERSECT [ALL | DISTINCT]',
])

const reservedKeywordPhrases = expandPhrases([
  'IS [NOT] MISSING',
  'IS [NOT] NULL',
])

// The PartiQL keyword set DynamoDB actually accepts. Kept intentionally lean —
// adding keywords that DynamoDB doesn't understand just adds false positives in
// formatter output.
const reservedKeywords = [
  'ALL', 'AND', 'AS', 'ASC', 'BETWEEN', 'BY', 'CASE',
  'CONTAINS', 'BEGINS_WITH', 'ATTRIBUTE_EXISTS', 'ATTRIBUTE_NOT_EXISTS', 'SIZE',
  'DESC', 'DISTINCT', 'ELSE', 'END', 'EXCEPT', 'EXISTS',
  'FALSE', 'IN', 'INTERSECT', 'IS', 'LIKE', 'MISSING',
  'NOT', 'NULL', 'OR', 'THEN', 'TRUE', 'UNION', 'WHEN',
]

const reservedDataTypes = [
  'S', 'N', 'B', 'BOOL', 'NULL', 'L', 'M', 'SS', 'NS', 'BS',
  'STRING', 'NUMBER', 'BINARY', 'LIST', 'MAP', 'BOOLEAN',
]

const reservedFunctionNames: string[] = []

export const partiqlDialect: DialectOptions = {
  name: 'partiql',
  tokenizerOptions: {
    reservedSelect,
    reservedClauses: [...reservedClauses, ...onelineClauses],
    reservedSetOperations,
    reservedJoins: [],
    reservedKeywordPhrases,
    reservedDataTypePhrases: [],
    reservedKeywords,
    reservedDataTypes,
    reservedFunctionNames,
    // PartiQL document literals `{...}` and list literals `[...]`. The formatter
    // treats them as extra parentheses, which preserves their contents verbatim
    // rather than trying to reformat the contained commas / keys. Exactly what
    // we want — users don't expect auto-format to rewrite document literals.
    extraParens: ['[]', '{}'],
    // String: single-quoted, doubled ''-escape. No U&'...' unicode prefix form.
    stringTypes: [{ quote: "''-qq", prefixes: [] }],
    // Identifier: double-quoted, doubled ""-escape (PartiQL/ANSI).
    identTypes: ['""-qq'],
    paramTypes: { positional: true },
    operators: ['%', '||'],
  },
  formatOptions: {
    onelineClauses,
    tabularOnelineClauses: onelineClauses,
  },
}
