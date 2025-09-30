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
  commandTokens: Set<string>;
}

// Build command lookup: lowercase command name -> command data
// const REDIS_COMMAND_DOCS_KEYS = Object.keys(REDIS_COMMAND_DOCS) as (keyof typeof REDIS_COMMAND_DOCS)[];
const REDIS_COMMAND_DOCS_KEYS_REVERSED = Object.keys(
  REDIS_COMMAND_DOCS
).reverse() as (keyof typeof REDIS_COMMAND_DOCS)[];

// Reverse is to ensure that more specific commands are matched before command groups
// This highly depends on sorting order of the keys in REDIS_COMMAND_DOCS
function findCommand(text: string): string | null {
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
      commandTokens: new Set(),
    };
  },

  token(stream, state) {
    // Skip whitespace
    if (stream.eatSpace()) {
      return null;
    }

    // Handle end of line - reset state for next line
    if (stream.sol()) {
      state.commandName = null;
      state.commandTokens = new Set();
    }

    // Handle comments
    if (stream.match(/^#.*/)) {
      return "comment";
    }

    // Handle strings
    if (state.inString) {
      const escaped = stream.current().endsWith("\\");
      const nextChar = stream.next();

      if (nextChar === state.stringDelim && !escaped) {
        state.inString = false;
        state.stringDelim = null;
      }

      return "string";
    }

    // Check for string start
    const stringMatch = stream.match(/^["']/);
    if (stringMatch) {
      state.inString = true;
      state.stringDelim = stringMatch[0];
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

      // If no command identified yet, check if this starts a command
      if (!state.commandName) {
        const restOfLine = stream.string.slice(stream.start);
        const command = findCommand(restOfLine);

        if (command) {
          state.commandName = command;
          const commandData = REDIS_COMMAND_DOCS[command];
          state.commandTokens = new Set(
            commandData.tokens.map((t) => t.toLowerCase())
          );
          return "keyword";
        }

        return "atom";
      }

      // We're in a command context - check if this word is part of the command name
      const commandWords = state.commandName.split(" ");
      const currentPosition =
        stream.string.slice(0, stream.start).trim().split(/\s+/).length - 1;

      if (currentPosition < commandWords.length) {
        return "keyword";
      }

      // Check if this is a known token/keyword for this command
      if (state.commandTokens.has(wordLower)) {
        return "keyword";
      }

      // Default: regular argument
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
    const info: any = REDIS_COMMAND_DOCS[matchedCommand];
    if (info?.tokens?.length) {
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
