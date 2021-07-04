import { ColumnType, DialectData } from "./models";



const types = [
  'serial', 'smallserial', 'bigserial', 'int', 'int2', 'int4', 'int8', 'smallint', 'integer', 'bigint', 'decimal', 'numeric', 'real', 'float', 'float4', 'float8', 'double precision', 'money', 'character varying', 'varchar', 'character', 'char', 'text', 'citext', 'hstore', 'bytea', 'bit', 'varbit', 'bit varying', 'timetz', 'timestamptz', 'timestamp', 'timestamp without time zone', 'timestamp with time zone', 'date', 'time', 'time without time zone', 'time with time zone', 'interval', 'bool', 'boolean', 'enum', 'point', 'line', 'lseg', 'box', 'path', 'polygon', 'circle', 'cidr', 'inet', 'macaddr', 'tsvector', 'tsquery', 'uuid', 'xml', 'json', 'jsonb', 'int4range', 'int8range', 'numrange', 'tsrange', 'tstzrange', 'daterange', 'geometry', 'geography', 'cube', 'ltree'
]

const supportsLength = [
  'varchar', 'char', 'character varying', 'character'
]

const defaultLength =(t: string) => {
  if (t.startsWith('var')) return 255
  return 8
}

export const PostgresData: DialectData = {
  columnTypes: types.map((t) => new ColumnType(t, supportsLength.includes(t), defaultLength(t))),
  wrapIdentifier: (id: string) => `"${id.replaceAll(/"/g, '""')}"`,
  wrapString: (str: string, quote?: boolean) => {
    const quoted = str.replaceAll(/'/g, "''")
    if (quote) {
      return `'${quoted}'`
    } else {
      return quoted
    }
  },
  // Copyright node-postgres - https://github.com/brianc/node-postgres/blob/4b229275cfe41ca17b7d69bd39f91ada0068a5d0/packages/pg/lib/client.js
  wrapLiteral: (str) => {
    let hasBackslash = false
    let escaped = "'"

    for (let i = 0; i < str.length; i++) {
      const c = str[i]
      if (c === "'") {
        escaped += c + c
      } else if (c === '\\') {
        escaped += c + c
        hasBackslash = true
      } else {
        escaped += c
      }
    }
    escaped += "'"

    if (hasBackslash === true) {
      escaped = ' E' + escaped
    }

    return escaped
  }


}