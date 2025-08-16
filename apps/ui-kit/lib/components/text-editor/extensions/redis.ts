/**
 * Redis Language Extension for CodeMirror 6
 *
 * Provides syntax highlighting and autocompletion for Redis commands
 */

import { LanguageSupport, StreamLanguage } from "@codemirror/language";
import { CompletionContext } from "@codemirror/autocomplete";
import {
  REDIS_COMMANDS,
  REDIS_OPTIONS,
  REDIS_COMMAND_NAMES,
  REDIS_OPTION_NAMES,
  getCommandDescription,
  getOptionDescription,
} from "./redisCommands";

// Stream parser for Redis syntax
const redisStreamParser = StreamLanguage.define({
  name: "redis",

  startState() {
    return {
      inString: false,
      stringDelim: null,
    };
  },

  token(stream, state) {
    // Skip whitespace
    if (stream.eatSpace()) return null;

    // Handle comments
    if (stream.match(/^#.*/)) {
      return "comment";
    }

    // Handle strings
    if (state.inString) {
      if (stream.next() === state.stringDelim) {
        state.inString = false;
        state.stringDelim = null;
        return "string";
      }
      stream.skipTo(state.stringDelim) || stream.skipToEnd();
      return "string";
    }

    // Check for string delimiters
    if (stream.match(/^["']/)) {
      state.inString = true;
      state.stringDelim = stream.current();
      return "string";
    }

    // Handle numbers
    if (stream.match(/^-?\d+(\.\d+)?/)) {
      return "number";
    }

    // Handle words (commands, options, arguments)
    if (stream.match(/^\w+(\.\w+)?/)) {
      const token = stream.current().toUpperCase();

      if (REDIS_COMMANDS[token]) {
        return "keyword";
      }

      if (REDIS_OPTIONS[token]) {
        return "keyword";
      }

      return "atom"; // Arguments and other identifiers
    }

    // Default: consume any character
    stream.next();
    return null;
  },

  languageData: {
    commentTokens: { line: "#" },
    closeBrackets: { brackets: ["(", "[", "{", "'", '"'] },
  },
});

// Autocompletion function
function redisCompletion(context: CompletionContext) {
  const word = context.matchBefore(/\w*/);
  if (word === null || (word.from === word.to && !context.explicit))
    return null;

  const wordUpper = word.text.toUpperCase();
  const options = [];

  // Add matching commands
  for (const cmd of REDIS_COMMAND_NAMES) {
    if (cmd.startsWith(wordUpper)) {
      options.push({
        label: cmd,
        type: "keyword",
        info: getCommandDescription(cmd) || `Redis ${cmd} command`,
        boost: cmd.length < 5 ? 10 : 0, // Boost short, common commands
      });
    }
  }

  // Add matching options
  for (const opt of REDIS_OPTION_NAMES) {
    if (opt.startsWith(wordUpper)) {
      options.push({
        label: opt,
        type: "keyword",
        info: getOptionDescription(opt) || `Redis ${opt} option`,
        boost: -1, // Lower priority for options
      });
    }
  }

  return options.length
    ? {
        from: word.from,
        options: options.slice(0, 50),
      }
    : null;
}

// Export Redis language support
export function redis() {
  return new LanguageSupport(redisStreamParser, [
    redisStreamParser.data.of({
      autocomplete: redisCompletion,
    }),
  ]);
}
