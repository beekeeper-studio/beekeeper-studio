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
  /**
   * A list of all tables in key-value form, where the key is the table name.
   **/
  tableWordList: WordList;
  /**
   * A list of all tables in array form.
   */
  tableWords: Word[];
  schemaWordList: WordList;
}

export function findWord(wordList: WordList, word: string) {
  return wordList[word];
}

export function makeDBHint(
  tables: TableOrView[],
  dialectData: DialectData,
  defaultSchema?: string | null
): DBHint {
  const schemaSet = new Set<string>();
  if (defaultSchema) schemaSet.add(defaultSchema);
  if(defaultSchema === null) defaultSchema = undefined;

  const tableWords: Word[] = [];

  const tableWordList = tables.reduce((acc, table) => {
    if (table.schema) schemaSet.add(table.schema);

    const word = {
      name: table.name,
      text: dialectData.maybeWrapIdentifier(table.name),
      type: "table" as const,
      schema: table.schema || defaultSchema,
    };

    tableWords.push(word);

    const key = table.name;
    const registeredWord = acc[key];
    if (registeredWord && registeredWord.schema === defaultSchema) return acc;

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
    tableWordList,
  };
}

const captureTableNameRegex = /"(.*)"/;

export function queryTable(dbHint: DBHint, query: string) {
  const tableNameQuery = captureTableNameRegex.exec(query)?.[1] || query;
  const table = findWord(dbHint.tableWordList, tableNameQuery);
  if (table) return table;
  return dbHint.tableWords.find(
    (table) =>
      `${table.schema}.${table.name}` === query || table.name === tableNameQuery
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
