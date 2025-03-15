import CodeMirror from "codemirror";

(function(mod) {
  mod(CodeMirror);
})(function(CodeMirror) {
  "use strict";
  var Pos = CodeMirror.Pos;
  console.log('REGISTERING HELPER')

  CodeMirror.registerHelper("hint", "mongo", async function(editor, options) {
    console.log('RUNNING AUTOCOMPLETE')
    const promptLine = options?.promptLine;
    const promptSymbol = options?.promptSymbol;
    const connection = options?.connection;

    const doc = editor.getDoc();
    const lastLineNum = editor.lastLine();

    const cmd = doc.getRange(
      { line: promptLine, ch: promptSymbol.length },
      { line: lastLineNum, ch: Infinity }
    );

    const completions = await connection.getCompletions(cmd);

    const list = completions.map((c) => {
      return { text: w, className: "CodeMirror-hint-table"}
    })

    return { list, from: Pos(promptLine, promptSymbol.length), to: Pos(lastLineNum, Infinity) }
  });
});
