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
}

// Build command lookup: lowercase command name -> command data
// const REDIS_COMMAND_DOCS_KEYS = Object.keys(REDIS_COMMAND_DOCS) as (keyof typeof REDIS_COMMAND_DOCS)[];
const REDIS_COMMAND_DOCS_KEYS_REVERSED = Object.keys(
  REDIS_COMMAND_DOCS
).reverse() as (keyof typeof REDIS_COMMAND_DOCS)[];

// Reverse is to ensure that more specific commands are matched before command groups
// This highly depends on sorting order of the keys in REDIS_COMMAND_DOCS
function findCommand(text: string): keyof typeof REDIS_COMMAND_DOCS | null {
  const lowerText = text.toLowerCase();

  for (const key of REDIS_COMMAND_DOCS_KEYS_REVERSED) {
    if (lowerText.startsWith(key)) {
      return key;
    }
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
    };
  },

  token(stream, state) {
    // Handle line start - reset state for new line
    if (stream.sol()) {
      state.commandName = null;
      state.commandWordCount = 0;
      state.commandTokens = new Set();
      state.wordPosition = 0;
    }

    // Skip whitespace
    if (stream.eatSpace()) {
      return null;
    }

    // Handle comments
    if (stream.match(/^#.*/)) {
      return "comment";
    }

    // Handle strings
    if (state.inString) {
      let escaped = false;
      while (!stream.eol()) {
        const ch = stream.next();
        if (ch === state.stringDelim && !escaped) {
          state.inString = false;
          state.stringDelim = null;
          break;
        }
        escaped = !escaped && ch === "\\";
      }
      return "string";
    }

    // Check for string start
    if (stream.match(/^["']/)) {
      state.inString = true;
      state.stringDelim = stream.current();
      return "string";
    }

    // Handle numbers (including negative and floats)
    if (stream.match(/^-?\d+(\.\d+)?/)) {
      return "number";
    }

    // Handle words (commands, keywords, arguments)
    const wordMatch = stream.match(/^[^\s"']+/);
    if (wordMatch) {
      const word = wordMatch[0];
      const wordLower = word.toLowerCase();

      // If no command detected yet, find it from the line
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

      // Check if this word is part of the command name itself
      if (state.commandName && state.wordPosition < state.commandWordCount) {
        state.wordPosition++;
        return "keyword";
      }

      // Check if this word is a known token/keyword for this command
      if (state.commandTokens.has(wordLower)) {
        state.wordPosition++;
        return "keyword";
      }

      // Default: regular argument
      state.wordPosition++;
      return "atom";
    }

    // Consume any other character
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

  const visited = new Set<string>();
  const options: Completion[] = [];

  for (const [key, info] of Object.entries(REDIS_COMMAND_DOCS)) {
    if (key.startsWith(trimmedLine)) {
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
