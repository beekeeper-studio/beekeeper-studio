import type { TableOrView } from "@/lib/db/models";
import { DialectData } from "@shared/lib/dialects/models";

interface Word {
  /**
   * The completion text for codemirror. This is wrapped with quotations if
   * needed, e.g. '"special+table"'.
   **/
  text: string;
  /**
   * The name of the corresponding type. This is not wrapped with quotations.
   **/
  name: string;
  type: "schema" | "table" | "column";
  /**
   * The name of the corresponding schema of the table without quotations (if
   * the database supports schemas).
   **/
  schema?: string;
}

/**
 * A list of all words in key-value form, where the key is the word that's
 * case sensitive.
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
  /**
   * List of all tables in array form. This is helpful for querying tables by
   * the schema.
   **/
  tableWords: Word[];
  schemaWordList: WordList;
  dialect: DialectData;
}

export function makeDBHint(
  tables: TableOrView[],
  dialect: DialectData,
  defaultSchema?: string | null | undefined
): DBHint {
  const schemaSet = new Set<string>();
  if (defaultSchema) schemaSet.add(defaultSchema);
  if (defaultSchema === null) defaultSchema = undefined;

  const tableWords: Word[] = [];

  const defaultTableWordList: WordList = tables.reduce((acc, table) => {
    if (table.schema) schemaSet.add(table.schema);

    const name = table.name;
    const normalizedName = dialect.editorFriendlyIdentifier(name);
    const schema = table.schema || defaultSchema;

    const normalizedWord: Word = {
      name,
      text: normalizedName,
      type: "table" as const,
      schema,
    };

    tableWords.push(normalizedWord);

    let unnormalizedWord: Word | undefined;

    if (normalizedName !== name) {
      unnormalizedWord = {
        name,
        text: name,
        type: "table" as const,
        schema,
      };
      tableWords.push(unnormalizedWord);
    }

    // Make sure to not include the tables outside the default schema to appear
    // in the autocomplete right away. But we still need it in tableWords so it
    // can be queried.
    if (table.schema && table.schema !== defaultSchema) return acc;

    return {
      ...acc,
      [normalizedName]: normalizedWord,
      ...(normalizedName !== name && { [name]: unnormalizedWord }),
    };
  }, {});

  const schemaWordList = Array.from(schemaSet).reduce(
    (acc, name) => ({
      ...acc,
      [name]: {
        name,
        text: dialect.editorFriendlyIdentifier(name),
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

const SCHEMA_TABLE =
  /(?:(?<schema>(['"`]?).+?\2?)\.(?<table1>(['"`]?).+\4?)|(?<table2>(['"`]?).+\6?))/;

export function queryTable(dbHint: DBHint, query: string) {
  const schemaTable = SCHEMA_TABLE.exec(query);
  if (!schemaTable) return undefined;

  const schema = schemaTable.groups?.schema || dbHint.defaultSchema;
  const table = schemaTable.groups?.table1 || schemaTable.groups?.table2;

  if (!table) return undefined;

  const unwrappedTable = dbHint.dialect.unwrapIdentifier(table);
  const unwrappedSchema = schema
    ? dbHint.dialect.unwrapIdentifier(schema)
    : undefined;

  if (
    dbHint.defaultTableWordList[unwrappedTable] &&
    dbHint.defaultTableWordList[unwrappedTable].schema === unwrappedSchema
  ) {
    return dbHint.defaultTableWordList[unwrappedTable];
  }

  return dbHint.tableWords.find(
    (table) => table.schema === unwrappedSchema && table.name === unwrappedTable
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

export interface Editor {
  display: { view: { [line: number]: { line: { text: string } } } };
}

export interface Cursor {
  line: number;
  ch: number;
}

export function getTextNearCursor(editor: Editor, cursor: Cursor) {
  const fullText = editor.display.view[cursor.line].line.text;
  const textBeforeCursor = fullText.substring(0, cursor.ch);
  const text = splitWords(textBeforeCursor).pop();
  const startAt = textBeforeCursor.length - text.length;
  return { text, startAt };
}

export function splitSchemaTable(str: string) {
  const [schema, ...table] = str.split(".");
  return [schema, table.join(".")];
}

export function isQuote(str: string) {
  return str === "'" || str === '"' || str === "`";
}

const WORD_SPLITTER = /`[^`]*`[^\s]*|'[^']*'[^\s]*|"[^"]*"[^\s]*|[^\s]+/g;

export function splitWords(text: string) {
  return text.match(WORD_SPLITTER) || [];
}
