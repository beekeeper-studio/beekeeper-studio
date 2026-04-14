/**
 * Redis Language Extension for CodeMirror 6
 *
 * Provides syntax highlighting and autocompletion for Redis commands
 */

import { LanguageSupport, StreamLanguage } from "@codemirror/language";
import {
  CompletionContext,
  CompletionResult,
  Completion,
} from "@codemirror/autocomplete";
// import splitArgs from "redis-splitargs";
import REDIS_COMMAND_DOCS from "./redisCommands.json";

interface RedisState {
  inString: boolean;
  stringDelim: string | null;
  commandName: string | null;
  commandWordCount: number;
  commandTokens: Set<string>;
  wordPosition: number;
  hasContentOnLine: boolean;
}

// Split command text into tokens and progressively match from most specific to least specific
function findCommand(text: string): keyof typeof REDIS_COMMAND_DOCS | null {
  const tokens = text.trim().toLowerCase().split(/\s+/).filter(Boolean);

  while (tokens.length > 0) {
    const candidate = tokens.join(' ');

    if (candidate in REDIS_COMMAND_DOCS) {
      return candidate as keyof typeof REDIS_COMMAND_DOCS;
    }

    tokens.pop();
  }

  return null;
}

// Stream parser for Redis syntax highlighting
export const redisStreamParser = StreamLanguage.define<RedisState>({
  name: "redis",

  startState(): RedisState {
    return {
      inString: false,
      stringDelim: null,
      commandName: null,
      commandWordCount: 0,
      commandTokens: new Set(),
      wordPosition: 0,
      hasContentOnLine: false,
    };
  },

  token(stream, state) {
    // Line start - reset state
    if (stream.sol()) {
      state.commandName = null;
      state.commandWordCount = 0;
      state.commandTokens = new Set();
      state.wordPosition = 0;
      state.hasContentOnLine = false;
    }

    if (stream.eatSpace()) return null;

    // Comments - only at start of line (after optional whitespace)
    if (!state.hasContentOnLine && stream.match(/^#.*/)) return "comment";

    // String handling
    if (state.inString) {
      while (!stream.eol()) {
        const ch = stream.next();
        if (ch === "\\") {
          stream.next(); // Skip escaped character
        } else if (ch === state.stringDelim) {
          state.inString = false;
          state.stringDelim = null;
          break;
        }
      }
      return "string";
    }

    // String start
    if (stream.match(/^["']/)) {
      state.inString = true;
      state.stringDelim = stream.current();
      state.hasContentOnLine = true;
      return "string";
    }

    // Numbers
    if (stream.match(/^-?\d+(\.\d+)?/)) {
      state.hasContentOnLine = true;
      return "number";
    }

    // Words
    if (stream.match(/^[^\s"']+/)) {
      const word = stream.current();
      const wordLower = word.toLowerCase();
      state.hasContentOnLine = true;

      // Detect command once on first word
      if (!state.commandName) {
        const command = findCommand(stream.string);
        if (command) {
          state.commandName = command;
          state.commandWordCount = command.split(" ").length;
          const commandData = REDIS_COMMAND_DOCS[command];
          state.commandTokens = new Set(
            commandData.tokens.map((t: string) => t.toLowerCase())
          );
        }
      }

      // Classify word: command part or keyword argument or regular atom
      const isCommandWord = state.wordPosition < state.commandWordCount;
      const isKeyword = state.commandTokens.has(wordLower);

      state.wordPosition++;

      return isCommandWord || isKeyword ? "keyword" : "atom";
    }

    // Fallback
    stream.next();
    return null;
  },

  languageData: {
    commentTokens: { line: "#" },
    closeBrackets: { brackets: ["(", "[", "{", "'", '"'] },
  },
});


// Autocompletion for Redis commands and their arguments
export function redisCompletion(
  context: CompletionContext
): CompletionResult | null {
  const currentWord = context.matchBefore(/\S*/);
  const currentLine = context.matchBefore(/.*/);

  if (!currentWord || !currentLine) return null;

  // const endsWithSpace = false
  const completedWords = [...currentLine.text.matchAll(/\S /g)].length;
  const trimmedLine = currentLine.text.trim();
  const trimmedLineLower = trimmedLine.toLowerCase();

  const visited = new Set<string>();
  const options: Completion[] = [];

  for (const [key, info] of Object.entries(REDIS_COMMAND_DOCS)) {
    if (key.startsWith(trimmedLineLower)) {
      const parts = key.split(" ").slice(completedWords, completedWords + 1);
      const label = parts.join(" ");

      if (parts.length && !visited.has(label)) {
        visited.add(label);
        options.push({
          label,
          type: completedWords > 0 ? "method" : "function",
          info: "summary" in info ? info.summary : "",
        });
      }
    }
  }

  const matchedCommand = findCommand(trimmedLine);

  if (matchedCommand) {
    const info = REDIS_COMMAND_DOCS[matchedCommand];
    if (info && 'tokens' in info) {
      for (const token of info.tokens) {
        options.push({
          label: token,
          type: "keyword",
        });
      }

    }
  }

  return { options, from: currentWord.from };
}

// Export Redis language support
export function redis() {
  return new LanguageSupport(redisStreamParser, [
    redisStreamParser.data.of({
      autocomplete: redisCompletion,
    }),
  ]);
}
