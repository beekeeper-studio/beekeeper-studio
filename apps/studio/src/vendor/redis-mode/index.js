/* eslint-disable */
// Redis mode for CodeMirror 5
// Based on CodeMirror SQL mode structure

import CodeMirror from "codemirror";
import { getCommandNames, getOptionNames } from "@/shared/lib/redis/redis-commands";

(function(mod) {
  mod(CodeMirror);
})(function(CodeMirror) {
  "use strict";

  // Use centralized Redis commands and options
  var REDIS_COMMANDS = getCommandNames();
  var REDIS_OPTIONS = getOptionNames();

  // Create keywords object for CodeMirror
  var keywords = {};
  REDIS_COMMANDS.forEach(function(cmd) {
    keywords[cmd.toLowerCase()] = true;
    keywords[cmd.toUpperCase()] = true;
  });

  REDIS_OPTIONS.forEach(function(opt) {
    keywords[opt.toLowerCase()] = true;
    keywords[opt.toUpperCase()] = true;
  });

  function tokenBase(stream, state) {
    var ch = stream.next();

    // Handle comments
    if (ch === "#") {
      stream.skipToEnd();
      return "comment";
    }

    // Handle strings
    if (ch === '"' || ch === "'") {
      state.tokenize = tokenString(ch);
      return state.tokenize(stream, state);
    }

    // Handle numbers
    if (/\d/.test(ch)) {
      stream.eatWhile(/[\w.]/);
      return "number";
    }

    // Handle words (commands and arguments)
    if (/\w/.test(ch)) {
      stream.eatWhile(/[\w.]/);
      var word = stream.current();
      var wordUpper = word.toUpperCase();

      // Check if it's a Redis command
      if (REDIS_COMMANDS.indexOf(wordUpper) !== -1) {
        return "keyword";
      }

      // Check if it's a Redis option
      if (REDIS_OPTIONS.indexOf(wordUpper) !== -1) {
        return "keyword";
      }

      return "atom";
    }

    // Skip other characters
    return null;
  }

  function tokenString(quote) {
    return function(stream, state) {
      var escaped = false, next;
      while ((next = stream.next()) != null) {
        if (next === quote && !escaped) {
          state.tokenize = tokenBase;
          break;
        }
        escaped = !escaped && next === "\\";
      }
      return "string";
    };
  }

  // Define the Redis mode
  CodeMirror.defineMode("redis", function(config, parserConfig) {
    return {
      startState: function() {
        return {
          tokenize: tokenBase
        };
      },

      token: function(stream, state) {
        if (stream.eatSpace()) return null;
        return state.tokenize(stream, state);
      },

      lineComment: "#"
    };
  });

  // Register MIME types
  CodeMirror.defineMIME("text/x-redis", {
    name: "redis",
    keywords: keywords,
    identifierQuote: '"'
  });

  // TODO: this causes runtime error - CodeMirror.modeInfo is not defined!
  // Also register the mode name directly for compatibility
  // CodeMirror.modeInfo.push({
  //   name: "Redis",
  //   mime: "text/x-redis",
  //   mode: "redis"
  // });
});
