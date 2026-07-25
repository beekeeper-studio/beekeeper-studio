/**
 * INI Language Extension for CodeMirror 6
 *
 * Provides syntax highlighting and key autocompletion for INI config files.
 */

import { LanguageSupport, StreamLanguage } from "@codemirror/language";
import {
  CompletionContext,
  CompletionResult,
  Completion,
} from "@codemirror/autocomplete";

export interface IniKeyDefinition {
  /** The section the key belongs to, e.g. `ui.general`. */
  section: string;
  /** The bare key name, e.g. `save`. */
  key: string;
  /** Shown alongside the completion so the current default is visible. */
  defaultValue?: string;
}

// Autocompletion needs to know which keys are legal, and that is owned by the
// embedding app rather than by the editor. Registered once at startup, the same
// way the clipboard implementation is.
let knownKeys: IniKeyDefinition[] = [];

export function setIniKeys(keys: IniKeyDefinition[]): void {
  knownKeys = keys;
}

interface IniState {
  /** Everything after the `=` on the current line is a value. */
  inValue: boolean;
  /** Nothing but whitespace seen on the current line so far. */
  atLineStart: boolean;
}

export const iniStreamParser = StreamLanguage.define<IniState>({
  name: "ini",

  startState(): IniState {
    return { inValue: false, atLineStart: true };
  },

  token(stream, state) {
    if (stream.sol()) {
      state.inValue = false;
      state.atLineStart = true;
    }

    if (stream.eatSpace()) return null;

    // Comments run to end of line, and only start a line.
    if (state.atLineStart && stream.match(/^[;#].*/)) {
      state.atLineStart = false;
      return "comment";
    }

    // Section headers: [ui.general]
    if (state.atLineStart && stream.peek() === "[") {
      stream.next();
      state.atLineStart = false;
      if (stream.match(/^[^\]\r\n]+/)) {
        stream.eat("]");
        return "keyword";
      }
      // Unclosed header. Let the linter report it; just don't mis-highlight.
      return "bracket";
    }

    if (state.inValue) {
      // Quoted values keep their quotes as part of the string token.
      if (stream.match(/^"(?:[^"\\]|\\.)*"?/) || stream.match(/^'(?:[^'\\]|\\.)*'?/)) {
        return "string";
      }
      if (stream.match(/^-?\d+(?:\.\d+)?\s*$/)) return "number";
      if (stream.match(/^(?:true|false|null)\s*$/i)) return "atom";
      stream.skipToEnd();
      return "string";
    }

    if (stream.eat("=")) {
      state.inValue = true;
      state.atLineStart = false;
      return "operator";
    }

    // Key names, including the `key[]` array form.
    if (stream.match(/^[^=\s\[\]]+/)) {
      state.atLineStart = false;
      stream.match(/^\[\s*\]/); // the array suffix belongs to the key
      return "propertyName";
    }

    stream.next();
    state.atLineStart = false;
    return null;
  },

  languageData: {
    commentTokens: { line: "#" },
  },
});

/** The section header the given position sits under, or "" at top level. */
function sectionAt(context: CompletionContext): string {
  const upToCursor = context.state.doc.sliceString(0, context.pos);
  let section = "";
  for (const line of upToCursor.split("\n")) {
    const match = /^\s*\[([^\]]+)\]/.exec(line);
    if (match) section = match[1].trim();
  }
  return section;
}

export function iniCompletion(
  context: CompletionContext
): CompletionResult | null {
  if (knownKeys.length === 0) return null;

  const line = context.state.doc.lineAt(context.pos);
  const beforeCursor = line.text.slice(0, context.pos - line.from);

  // Inside a section header: complete section names.
  const sectionMatch = /^\s*\[([^\]]*)$/.exec(beforeCursor);
  if (sectionMatch) {
    const word = context.matchBefore(/[\w.]*/);
    const options: Completion[] = [...new Set(knownKeys.map((k) => k.section))]
      .filter(Boolean)
      .map((s) => ({ label: s, type: "namespace" }));
    return { options, from: word ? word.from : context.pos };
  }

  // Past the `=` we would be completing a value, which we don't do.
  if (beforeCursor.includes("=")) return null;

  const word = context.matchBefore(/[\w.]*/);
  if (!word) return null;
  if (word.from === word.to && !context.explicit) return null;

  const section = sectionAt(context);
  const options: Completion[] = knownKeys
    .filter((k) => k.section === section)
    .map((k) => ({
      label: k.key,
      type: "property",
      detail: k.defaultValue,
    }));

  if (options.length === 0) return null;

  return { options, from: word.from };
}

export function ini() {
  return new LanguageSupport(iniStreamParser, [
    iniStreamParser.data.of({
      autocomplete: iniCompletion,
    }),
  ]);
}
