/**
 * A CodeMirror 6 extension that provides query magic functionality.
 * This replaces the old CodeMirror 5 queryMagicHandler with CodeMirror 6 compatible code.
 *
 * Query magic allows typing patterns like "table__column__format" to get autocompletion
 * suggestions for magic columns based on available tables and their columns.
 *
 * Usage:
 * 1. Create instance: const queryMagic = queryMagicExtension()
 * 2. Add to extensions: queryMagic.extensions
 * 3. Set data providers: queryMagic.setDefaultSchemaGetter(() => schema)
 * 4. Set tables: queryMagic.setTablesGetter(() => tables)
 */

import {
  CompletionContext,
  CompletionResult,
} from "@codemirror/autocomplete";
import {
    EditorState,
  StateEffect,
  StateField,
} from "@codemirror/state";
import { EditorView, ViewPlugin } from "@codemirror/view";
import { TableOrView } from "@/lib/db/models";
import MagicColumnBuilder from "@/lib/magic/MagicColumnBuilder";
import rawLog from "@bksLogger";

const log = rawLog.scope("QueryMagicExtension");

// State effects for updating the magic data
const setDefaultSchema = StateEffect.define<() => string>();
const setTables = StateEffect.define<() => TableOrView[]>();

// State fields to store the magic data providers
const defaultSchemaGetter = StateField.define<(() => string) | null>({
  create() {
    return null;
  },
  update(value, tr) {
    for (let e of tr.effects) {
      if (e.is(setDefaultSchema)) return e.value;
    }
    return value;
  },
});

const tablesGetter = StateField.define<(() => TableOrView[]) | null>({
  create() {
    return null;
  },
  update(value, tr) {
    for (let e of tr.effects) {
      if (e.is(setTables)) return e.value;
    }
    return value;
  },
});

/**
 * Check if the current word contains magic patterns (double underscores)
 */
function containsMagicPattern(word: string): boolean {
  return word.includes("__");
}

/**
 * Extract the magic word from the current cursor position
 */
function extractMagicWord(context: CompletionContext): { word: string; from: number } | null {
  // Look for a word that might contain magic patterns
  const wordMatch = context.matchBefore(/\w+(?:__\w*)*/);
  if (!wordMatch) return null;

  const word = wordMatch.text;
  if (!containsMagicPattern(word)) return null;

  return { word, from: wordMatch.from };
}

/**
 * Handle autocomplete for magic patterns
 */
async function completionSource(
  context: CompletionContext
): Promise<CompletionResult | null> {
  const magicWord = extractMagicWord(context);
  if (!magicWord) return null;

  const defaultSchemaGetterFn = context.state.field(defaultSchemaGetter);
  const tablesGetterFn = context.state.field(tablesGetter);

  if (!defaultSchemaGetterFn || !tablesGetterFn) {
    log.warn("Query magic completion called without required data providers");
    return null;
  }

  try {
    const defaultSchema = defaultSchemaGetterFn();
    const tables = tablesGetterFn();

    log.debug("Query magic suggestions for:", magicWord.word, { defaultSchema, tables: tables.length });

    const suggestions = MagicColumnBuilder.suggestWords(
      magicWord.word,
      tables,
      defaultSchema
    );

    if (!suggestions || suggestions.length === 0) {
      return null;
    }

    const options = suggestions.map((suggestion) => {
      const parts = magicWord.word.split("__");
      parts[parts.length - 1] = suggestion;
      return {
        label: parts.join("__"),
      };
    });

    return {
      from: magicWord.from,
      options,
    };
  } catch (error) {
    log.error("Error in query magic completion:", error);
    return null;
  }
}

export function queryMagicExtension() {
  let view: EditorView;

  const extensions = [
    defaultSchemaGetter,
    tablesGetter,
    ViewPlugin.fromClass(
      class {
        constructor(v: EditorView) {
          view = v;
        }
      }
    ),
    EditorState.languageData.of(() => [{
      autocomplete: completionSource,
    }]),
  ];

  function setDefaultSchemaGetter(getter: () => string) {
    if (!view) {
      log.warn("Calling `setDefaultSchemaGetter` before extension is initialized.");
      return;
    }
    view.dispatch({ effects: setDefaultSchema.of(getter) });
  }

  function setTablesGetter(getter: () => TableOrView[]) {
    if (!view) {
      log.warn("Calling `setTablesGetter` before extension is initialized.");
      return;
    }
    view.dispatch({ effects: setTables.of(getter) });
  }

  return {
    extensions,
    setDefaultSchemaGetter,
    setTablesGetter,
  };
}
