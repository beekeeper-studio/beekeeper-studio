/* eslint-disable */
// Redis hints/autocompletion for CodeMirror 5
// Based on the sql-hint structure

import CodeMirror from "codemirror";
import { REDIS_COMMANDS, REDIS_OPTIONS } from "@/shared/lib/redis/redis-commands";

(function(mod) {
  mod(CodeMirror);
})(function(CodeMirror) {
  "use strict";

  var Pos = CodeMirror.Pos;

  // Use centralized Redis commands and options

  function getCompletions(editor, options) {
    var cur = editor.getCursor();
    var token = editor.getTokenAt(cur);
    var start = token.start;
    var end = cur.ch;
    var word = token.string.substr(0, end - start);
    
    if (word.length === 0) return null;

    var completions = [];
    
    var wordUpper = word.toUpperCase();

    // Get Redis commands
    for (var cmd in REDIS_COMMANDS) {
      if (cmd.indexOf(wordUpper) === 0) {
        completions.push({
          text: cmd,
          displayText: cmd,
          className: "CodeMirror-hint-keyword",
          hint: function(cm, data, completion) {
            cm.replaceRange(completion.text, Pos(cur.line, start), Pos(cur.line, end));
          },
          info: REDIS_COMMANDS[cmd]
        });
      }
    }

    // Get Redis options
    for (var opt in REDIS_OPTIONS) {
      if (opt.indexOf(wordUpper) === 0) {
        completions.push({
          text: opt,
          displayText: opt,
          className: "CodeMirror-hint-keyword",
          hint: function(cm, data, completion) {
            cm.replaceRange(completion.text, Pos(cur.line, start), Pos(cur.line, end));
          },
          info: REDIS_OPTIONS[opt]
        });
      }
    }

    // Sort completions
    completions.sort(function(a, b) {
      // Prioritize exact matches
      if (a.text === wordUpper) return -1;
      if (b.text === wordUpper) return 1;
      
      // Then sort alphabetically
      return a.text.localeCompare(b.text);
    });

    return {
      list: completions,
      from: Pos(cur.line, start),
      to: Pos(cur.line, end)
    };
  }

  // Register the hint helper
  CodeMirror.registerHelper("hint", "redis", getCompletions);
  
  // Also register for the MIME type
  CodeMirror.registerHelper("hint", "text/x-redis", getCompletions);
});