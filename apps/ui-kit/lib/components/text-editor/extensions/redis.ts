/**
 * Redis Language Extension for CodeMirror 6
 *
 * Provides syntax highlighting and autocompletion for Redis commands
 *
 * The whole file was written by LLM and looks like shit
 * But it kinda works and im not gonna optimize it unless there are issues
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
  // Match the current word being typed
  const word = context.matchBefore(/[\w-]*/);
  if (!word) return null;

  const wordLower = word.text.toLowerCase();

  // Get the full line up to the cursor for context
  const lineUpToCursor = context.matchBefore(/.*/);
  const fullText = lineUpToCursor ? lineUpToCursor.text : "";

  // Split the line into tokens to understand context
  const tokens = fullText.toLowerCase().trim().split(/\s+/);
  const isFirstToken = tokens.length <= 1;

  const options = [];
  const seen = new Set<string>(); // Avoid duplicates

  function extractArgumentTokens(args: any[]) {
    for (const arg of args) {
      if (arg.token && typeof arg.token === "string") {
        const tokenLower = arg.token.toLowerCase();
        if (!seen.has(tokenLower) && tokenLower.startsWith(wordLower)) {
          options.push({
            label: tokenLower,
            type: "keyword",
            info: arg.display_text || "",
            boost: -5,
          });
          seen.add(tokenLower);
        }
      }
      if (arg.arguments) {
        extractArgumentTokens(arg.arguments);
      }
    }
  }

  // Check if we already have a complete command
  let hasCompleteCommand = false;
  if (tokens.length >= 1) {
    const firstToken = tokens[0];
    const secondToken = tokens.length > 1 ? tokens[1] : "";
    const possibleTwoWordCommand = firstToken + " " + secondToken;

    // Check if we have a valid single-word or two-word command
    if (redisCommands[firstToken]) {
      hasCompleteCommand = true;
    } else if (tokens.length >= 2 && redisCommands[possibleTwoWordCommand]) {
      hasCompleteCommand = true;
    }
  }

  // Only suggest commands if we don't have a complete command yet
  if (!hasCompleteCommand && (isFirstToken || wordLower)) {
    // Suggest commands that match the current partial word
    for (const [cmd, docs] of Object.entries(redisCommands)) {
      if (cmd.startsWith(wordLower)) {
        const commandWords = cmd.split(' ');
        const typedWords = fullText.toLowerCase().trim().split(/\s+/);

        // For multi-word commands, check if we're typing the second word
        if (commandWords.length > 1 && typedWords.length > 1) {
          // Check if first word matches and we're typing the second word
          if (commandWords[0] === typedWords[0] && commandWords[1].startsWith(wordLower)) {
            options.push({
              label: commandWords[1], // Only complete the second word
              type: "keyword",
              info: (docs as any).summary ?? "",
              boost: 25 - cmd.length,
            });
            seen.add(commandWords[1]);
          }
        } else if (commandWords.length === 1 || typedWords.length === 1) {
          // Single word command or typing first word
          options.push({
            label: cmd,
            type: "keyword",
            info: (docs as any).summary ?? "",
            boost: 20 - cmd.length,
          });
          seen.add(cmd);
        }
      }
    }
  }

  // If we have a complete command, suggest its arguments/tokens
  if (hasCompleteCommand) {
    const firstToken = tokens[0];
    const secondToken = tokens.length > 1 ? tokens[1] : "";
    const possibleTwoWordCommand = firstToken + " " + secondToken;

    // Get the command spec for single or two-word command
    let commandSpec = redisCommands[possibleTwoWordCommand] || redisCommands[firstToken];

    if (commandSpec && commandSpec.arguments) {
      // Extract tokens from this command's arguments
      extractArgumentTokens(commandSpec.arguments);
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
