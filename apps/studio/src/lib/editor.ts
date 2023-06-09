import type { TableOrView } from "@/lib/db/models";
import { DialectData } from "@shared/lib/dialects/models";

interface Word {
  text: string;
  name: string;
  type: "schema" | "table" | "column";
  schema?: string;
}

/**
 * A list of all words in key-value form, where the key is the word in uppercase.
 * It's best to use the `findWord` function to find a word, as it will handle
 * uppercase and lowercase words.
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

/**
 * Use this instead of accessing the wordList directly
 */
export function findWord(wordList: WordList, word: string) {
  return wordList[word.toUpperCase()];
}

export function makeDBHint(
  tables: TableOrView[],
  dialectData: DialectData,
  defaultSchema?: string
): DBHint {
  const schemaSet = new Set<string>();
  if (defaultSchema) schemaSet.add(defaultSchema);

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

    return {
      ...acc,
      [table.name.toUpperCase()]: word,
    };
  }, {});

  const schemaWordList = Array.from(schemaSet).reduce(
    (acc, name) => ({
      ...acc,
      [name.toUpperCase()]: {
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
