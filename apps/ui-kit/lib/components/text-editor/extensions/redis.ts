/**
 * Redis Language Extension for CodeMirror 6
 *
 * Provides syntax highlighting and autocompletion for Redis commands
 */

import { LanguageSupport, StreamLanguage } from "@codemirror/language";
import { CompletionContext } from "@codemirror/autocomplete";
import redisCommands from "./redisCommands";

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

      if (redisCommands[token]) {
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
  const text = context.matchBefore(/.+/);
  // const wordLower = word.text.toLowerCase();
  const textLower = text ? text.text.toLowerCase() : "";
  const options = [];

  for (const [cmd, docs] of Object.entries(redisCommands)) {
    if (cmd.startsWith(textLower)) {
      options.push({
        label: cmd,
        type: "keyword",
        info: ((docs as any).summary) ?? `Redis ${cmd} command`,
        boost: 20 - cmd.length,
      })
    }

    if (textLower.startsWith(cmd)) {
      for (const argument of (docs as any).arguments) {
        if (argument.token) {
          options.push({
            label: argument.token.toLowerCase(),
            type: "keyword",
            info: "",
            boost: -5,
          })
        }
      }
    }
  }

  // // Add matching commands
  // for (const [cmd, docs] of Object.entries(redisCommands)) {
  //   if (cmd.startsWith(wordLower)) {
  //     options.push({
  //       label: cmd,
  //       type: "keyword",
  //       info: (docs as any).summary ?? `Redis ${cmd} command`,
  //       boost: 20 - cmd.length, // Boost short, common commands
  //     });
  //   }
  // }

  // // Add matching options
  // for (const [cmd, docs] of Object.entries(redisCommands)) {
  //   if (text.text.toLowerCase().startsWith(cmd)) {
  //     for (const argument of (docs as any).arguments) {
  //       if (argument.token?.startsWith(wordLower)) {
  //         options.push({
  //           label: argument.token.toLowerCase(),
  //           type: "keyword",
  //           info: argument.description,
  //           boost: -1, // Lower priority for options
  //         });
  //       }
  //     }
  //   }
  // }

  return options.length
    ? {
        from: word.from,
        options,
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
