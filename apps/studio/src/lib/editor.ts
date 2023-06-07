import type { TableOrView } from "@/lib/db/models";

interface DBHintTable {
  name: string;
  schema?: string;
}

type DBHintSchema = string;

interface Word {
  text: string;
  type: "table" | "schema";
  schema?: string;
}

type WordList = Record<string, Word>;

interface DBHint {
  tables: DBHintTable[];
  schemas: DBHintSchema[];
}

export function makeDBHint(
  tables: TableOrView[],
  connectionType: string
): DBHint {
  const schemaSet: Set<string> = new Set();
  const hintTables: DBHintTable[] = [];
  tables.forEach((table) => {
    hintTables.push({
      name:
        connectionType === "postgresql"
          ? sanitizeTableName(table.name)
          : table.name,
      schema: table.schema,
    });
    if (table.schema) schemaSet.add(table.schema);
  });
  return {
    tables: hintTables,
    schemas: Array.from(schemaSet),
  };
}

export function parseDBHintTables(tables: DBHintTable[]): WordList {
  return tables.reduce(
    (acc, table) => ({
      ...acc,
      [table.name.toUpperCase()]: {
        text: table.name,
        type: "table" as const,
        schema: table.schema,
      },
    }),
    {}
  );
}

export function parseDBHintTable(table: DBHintTable): Word {
  return {
    text: table.name,
    type: "table" as const,
    schema: table.schema,
  };
}

const captureTableNameRegex = /"(.*)"/;

export function queryTable(
  query: string,
  tables: DBHintTable[] | TableOrView[]
) {
  const tableNameQuery = captureTableNameRegex.exec(query)?.[1] || query;
  return tables.find(
    (table) =>
      `${table.schema}.${table.name}` === query || table.name === tableNameQuery
  );
}

export function findTablesBySchema(schema: string, tables: DBHintTable[]) {
  return tables.filter((table) => table.schema === schema);
}

export function pushTablesToResult(
  tables: DBHintTable[],
  result: any[],
  textModifier?: (text: string) => string
) {
  result.push(
    ...tables.map((table) => {
      const tableName = textModifier ? textModifier(table.name) : table.name;
      return {
        text: table.schema ? `${table.schema}.${tableName}` : tableName,
        displayText: table.name,
      };
    })
  );
}

const tableNameValidationRegex = /(?:[^a-z0-9_]|^\d)/;

export function sanitizeTableName(name: string): string {
  return tableNameValidationRegex.test(name) ? `"${name}"` : name;
}
