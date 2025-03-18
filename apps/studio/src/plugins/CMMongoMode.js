import CodeMirror from "codemirror";
import "codemirror/mode/javascript/javascript.js";

const PROMPT_REGEX = /^[^\n]+>\s/;

CodeMirror.defineMode("mongo", function (config, parserConfig) {
  const jsMode = CodeMirror.getMode(config, "javascript");

  return {
    startState: function () {
      return {
        jsState: CodeMirror.startState(jsMode),
        inPrompt: false,
        cmInstance: null
      };
    },

    token: function (stream, state) {
      if (stream.sol()) {
        // If a line starts with a known prompt symbol, treat it as a prompt
        if (stream.match(PROMPT_REGEX)) {
          state.inPrompt = true;
          return "prompt"; // Assign a custom class for styling
        }
        state.inPrompt = false;
      }

      return jsMode.token(stream, state.jsState);
    },

    indent: function (state, textAfter) {
      return jsMode.indent(state.jsState, textAfter);
    },

    copyState: function (state) {
      return {
        jsState: CodeMirror.copyState(jsMode, state.jsState),
        inPrompt: state.inPrompt,
      };
    },

    electricChars: jsMode.electricChars,
  };
});
