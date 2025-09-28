/**
 * Redis Language Extension for CodeMirror 6
 *
 * Provides syntax highlighting and autocompletion for Redis commands
 */

import { LanguageSupport, StreamLanguage } from "@codemirror/language";
import { CompletionContext } from "@codemirror/autocomplete";
import redisCommands from "./redisCommands";

interface RedisState {
  inString: boolean;
  stringDelim: string | null;
  commandName: string | null;
  commandSpec: any;
  tokenIndex: number;
  lineStart: boolean;
}

// Build a set of all possible Redis tokens from all commands
const allRedisTokens = new Set<string>();

function extractTokens(obj: any): void {
  if (Array.isArray(obj)) {
    for (const item of obj) {
      extractTokens(item);
    }
  } else if (obj && typeof obj === "object") {
    if (obj.token && typeof obj.token === "string") {
      allRedisTokens.add(obj.token.toUpperCase());
    }
    if (obj.arguments) {
      extractTokens(obj.arguments);
    }
  }
}

// Extract all tokens from all commands
for (const commandSpec of Object.values(redisCommands)) {
  extractTokens(commandSpec);
}

// Helper to check if a token is a Redis option/keyword token
function isRedisToken(token: string, commandSpec: any): boolean {
  if (!commandSpec || !commandSpec.arguments) return false;

  const upperToken = token.toUpperCase();

  // Recursively check arguments for token matches
  function checkArguments(args: any[]): boolean {
    for (const arg of args) {
      if (arg.token && arg.token === upperToken) return true;
      if (arg.arguments && checkArguments(arg.arguments)) return true;
    }
    return false;
  }

  return checkArguments(commandSpec.arguments);
}

// Helper to determine if current argument position should be a key
function isKeyPosition(commandSpec: any, tokenIndex: number): boolean {
  if (!commandSpec || !commandSpec.arguments) return false;

  // Simple heuristic: check if any of the early arguments are of type "key"
  // This is a simplified approach - could be enhanced with more sophisticated parsing
  const args = commandSpec.arguments;
  if (args.length > 0 && tokenIndex > 0) {
    // Check if this position corresponds to a key argument
    for (let i = 0; i < Math.min(args.length, tokenIndex); i++) {
      if (args[i] && args[i].type === "key") {
        return true;
      }
    }
  }

  return false;
}

// Stream parser for Redis syntax
const redisStreamParser = StreamLanguage.define({
  name: "redis",

  startState(): RedisState {
    return {
      inString: false,
      stringDelim: null,
      commandName: null,
      commandSpec: null,
      tokenIndex: 0,
      lineStart: true,
    };
  },

  token(stream, state) {
    // Skip whitespace
    if (stream.eatSpace()) {
      return null;
    }

    // Handle newlines - reset command context
    if (stream.eol()) {
      state.commandName = null;
      state.commandSpec = null;
      state.tokenIndex = 0;
      state.lineStart = true;
      return null;
    }

    // Handle comments
    if (stream.match(/^#.*/)) {
      return "comment";
    }

    // Handle strings
    if (state.inString) {
      if (stream.next() === state.stringDelim) {
        state.inString = false;
        state.stringDelim = null;
        state.tokenIndex++;
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

    // Handle special Redis operators and patterns
    if (stream.match(/^[*?\[\]]/)) {
      return "operator";
    }

    // Handle numbers
    if (stream.match(/^-?\d+(\.\d+)?/)) {
      state.tokenIndex++;
      return "number";
    }

    // Handle words (commands, options, arguments)
    if (stream.match(/^[\w\.:-]+/)) {
      const token = stream.current();
      const lowerToken = token.toLowerCase();
      const upperToken = token.toUpperCase();

      // First token on line - check if it's a command
      if (state.lineStart || state.tokenIndex === 0) {
        state.lineStart = false;

        // Check if it's a single-word Redis command
        if (redisCommands[lowerToken]) {
          state.commandName = lowerToken;
          state.commandSpec = redisCommands[lowerToken];
          state.tokenIndex = 1;
          return "keyword";
        }

        // Check for multi-word commands
        const restOfLine = stream.string.slice(stream.pos).trimStart();
        const firstWord = restOfLine.split(/\s+/)[0];
        if (firstWord) {
          const multiWordCommand = lowerToken + " " + firstWord.toLowerCase();
          if (redisCommands[multiWordCommand]) {
            state.commandName = lowerToken; // Store partial for next token
            state.commandSpec = null;
            state.tokenIndex = 0;
            return "keyword";
          }
        }

        // Not a recognized command
        state.commandName = null;
        state.commandSpec = null;
        state.tokenIndex++;
        return "atom";
      }

      // Check if we're completing a multi-word command
      if (state.commandName && !state.commandSpec) {
        const multiWordCommand = state.commandName + " " + lowerToken;
        if (redisCommands[multiWordCommand]) {
          state.commandName = multiWordCommand;
          state.commandSpec = redisCommands[multiWordCommand];
          state.tokenIndex = 1;
          return "keyword";
        }
        // Not part of a multi-word command, reset and treat as argument
        state.commandName = null;
        state.tokenIndex++;
        return "atom";
      }

      // We have an active command context
      if (state.commandSpec) {
        state.tokenIndex++;

        // Check if it's a Redis option/token for this command
        if (isRedisToken(token, state.commandSpec)) {
          return "keyword";
        }

        // Check if this position should be a key
        if (isKeyPosition(state.commandSpec, state.tokenIndex - 1)) {
          return "variable-2"; // Different color for keys
        }

        // Check if it's a known Redis token from any command
        if (allRedisTokens.has(upperToken)) {
          return "keyword";
        }

        // Default to argument/value
        return "atom";
      }

      // No command context - treat as generic argument
      state.tokenIndex++;
      return "atom";
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
  const text = context.matchBefore(/.+/);
  // const wordLower = word.text.toLowerCase();
  const textLower = text ? text.text.toLowerCase() : "";
  const options = [];

  for (const [cmd, docs] of Object.entries(redisCommands)) {
    if (cmd.startsWith(textLower)) {
      options.push({
        label: cmd,
        type: "keyword",
        info: (docs as any).summary ?? "",
        boost: 20 - cmd.length,
      });
    }

    if (textLower.startsWith(cmd)) {
      for (const argument of (docs as any).arguments) {
        if (argument.token) {
          options.push({
            label: argument.token.toLowerCase(),
            type: "keyword",
            info: "",
            boost: -5,
          });
        }

        if (argument.arguments) {
          for (const argument1 of argument.arguments) {
            if (argument1.token) {
              options.push({
                label: argument1.token.toLowerCase(),
                type: "keyword",
                info: "",
                boost: -5,
              });
            }

            if (argument1.arguments) {
              for (const argument2 of argument1.arguments) {
                if (argument2.token) {
                  options.push({
                    label: argument2.token.toLowerCase(),
                    type: "keyword",
                    info: "",
                    boost: -5,
                  });
                }
              }
            }
          }
        }
      }
    }
  }

  return options.length ? { from: word.from, options } : null;
}

// Export Redis language support
export function redis() {
  return new LanguageSupport(redisStreamParser, [
    redisStreamParser.data.of({
      autocomplete: redisCompletion,
    }),
  ]);
}
