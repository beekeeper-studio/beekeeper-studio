import type { TableOrView } from "@/lib/db/models";
import { DialectData } from "@shared/lib/dialects/models";

interface Word {
  text: string;
  name: string;
  type: "schema" | "table" | "column";
  schema?: string;
}

/**
 * A list of all words in key-value form, where the key is the word that's case sensitive.
 */
type WordList = Record<string, Word>;

export interface DBHint {
  defaultSchema?: string;
  /**
   * A list of tables in key-value form for fast queries, where the key
   * is the table name. If the database supports schemas, all tables are from
   * the default schema.
   **/
  defaultTableWordList: WordList;
  /** list of all tables in array form. */
  tableWords: Word[];
  schemaWordList: WordList;
  dialect: DialectData;
}

export function makeDBHint(
  tables: TableOrView[],
  dialect: DialectData,
  defaultSchema?: string | null
): DBHint {
  const schemaSet = new Set<string>();
  if (defaultSchema) schemaSet.add(defaultSchema);
  if (defaultSchema === null) defaultSchema = undefined;

  const tableWords: Word[] = [];

  const defaultTableWordList = tables.reduce((acc, table) => {
    if (table.schema) schemaSet.add(table.schema);

    const word = {
      name: table.name,
      text: dialect.friendlyNormalizedIdentifier(table.name),
      type: "table" as const,
      schema: table.schema || defaultSchema,
    };

    tableWords.push(word);

    const key = table.name;
    if (table.schema && table.schema !== defaultSchema) return acc;

    return { ...acc, [key]: word };
  }, {});

  const schemaWordList = Array.from(schemaSet).reduce(
    (acc, name) => ({
      ...acc,
      [name]: {
        name,
        text: name,
        type: "schema",
      },
    }),
    {}
  );

  return {
    tableWords,
    schemaWordList,
    defaultTableWordList,
    defaultSchema,
    dialect,
  };
}

const quot = "'\"`";

const SCHEMA_TABLE = new RegExp(
  "(?:(?<schema>[quot]?.+?[quot]?)\\.(?<table1>[quot]?.+[quot]?)|(?<table2>[quot]?.+[quot]?))".replaceAll(
    "quot",
    quot
  )
);

export function queryTable(dbHint: DBHint, query: string) {
  const schemaTable = SCHEMA_TABLE.exec(query);
  if (!schemaTable) return undefined;

  const schema = schemaTable.groups?.schema || dbHint.defaultSchema;
  const table = schemaTable.groups?.table1 || schemaTable.groups?.table2;

  if (!table) return undefined;

  const unwrappedTable = dbHint.dialect.unwrapIdentifier(table);
  const unwrappedSchema = schema ? dbHint.dialect.unwrapIdentifier(schema) : undefined;

  if (
    dbHint.defaultTableWordList[unwrappedTable] &&
    dbHint.defaultTableWordList[unwrappedTable].schema === unwrappedSchema
  ) {
    return dbHint.defaultTableWordList[unwrappedTable];
  }

  return dbHint.tableWords.find(
    (table) => table.schema === schema && table.name === unwrappedTable
  );
}

export function findTablesBySchema(dbHint: DBHint, schema: string) {
  return dbHint.tableWords.filter((table) => table.schema === schema);
}

export function findTableOrViewByWord(tableOrViews: TableOrView[], word: Word) {
  return tableOrViews.find(
    (tableOrView) =>
      tableOrView.name === word.name && tableOrView.schema === word.schema
  );
}

export function splitSchemaTable(str: string) {
  const [schema, ...table] = str.split(".");
  return [schema, table.join(".")];
}

export function isQuote(str: string) {
  return str === "'" || str === '"' || str === "`";
}
