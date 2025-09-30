/**
 * Redis Language Extension for CodeMirror 6
 *
 * Provides syntax highlighting and autocompletion for Redis commands
 */

import { LanguageSupport, StreamLanguage } from "@codemirror/language";
import { CompletionContext } from "@codemirror/autocomplete";
import REDIS_COMMAND_DOCS from "./redisCommands.json";

interface RedisState {
  inString: boolean;
  stringDelim: string | null;
  commandName: string | null;
  commandTokens: Set<string>;
}

// Build command lookup: lowercase command name -> command data
const redisCommands: Record<string, { summary: string; tokens: string[] }> =
  REDIS_COMMAND_DOCS as any;

// Build set of all command names for quick lookup
const allCommandNames = new Set(Object.keys(redisCommands));

// Find the longest matching command from the start of a line
function findCommand(text: string): string | null {
  const lowerText = text.toLowerCase();

  // Try multi-word commands first (up to 3 words)
  const words = lowerText.split(/\s+/).slice(0, 3);
  for (let wordCount = 3; wordCount > 0; wordCount--) {
    const candidate = words.slice(0, wordCount).join(" ");
    if (allCommandNames.has(candidate)) {
      return candidate;
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
          const commandData = redisCommands[command];
          state.commandTokens = new Set(
            commandData.tokens.map(t => t.toLowerCase())
          );
          return "keyword";
        }

        return "atom";
      }

      // We're in a command context - check if this word is part of the command name
      const commandWords = state.commandName.split(" ");
      const currentPosition = stream.string.slice(0, stream.start).trim().split(/\s+/).length - 1;

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
export function redisCompletion(context: CompletionContext) {
  const line = context.state.doc.lineAt(context.pos);
  const textBeforeCursor = line.text.slice(0, context.pos - line.from);
  const currentWord = context.matchBefore(/\S*/);

  if (!currentWord) return null;

  const trimmedLine = textBeforeCursor.trim();
  const partial = currentWord.text.toLowerCase();
  const options: any[] = [];

  // Try to find a command in what's been typed so far
  const matchedCommand = findCommand(trimmedLine);

  if (matchedCommand) {
    // We have a command - suggest its tokens
    const commandData = redisCommands[matchedCommand];

    for (const token of commandData.tokens) {
      if (token.toLowerCase().startsWith(partial)) {
        options.push({
          label: token,
          type: "keyword",
        });
      }
    }
  } else {
    // No command matched - suggest commands
    for (const [cmdName, cmdData] of Object.entries(redisCommands)) {
      if (cmdName.startsWith(partial)) {
        options.push({
          label: cmdName,
          type: "keyword",
          info: cmdData.summary,
        });
      }
    }
  }

  if (options.length === 0) return null;

  return {
    from: currentWord.from,
    options,
  };
}

// Export Redis language support
export function redis() {
  return new LanguageSupport(redisStreamParser, [
    redisStreamParser.data.of({
      autocomplete: redisCompletion,
    }),
  ]);
}
