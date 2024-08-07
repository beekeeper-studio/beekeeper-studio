import CodeMirror from "codemirror";

CodeMirror.defineMIME("text/x-pgsql", {
  // eslint-disable-next-line
  // @ts-ignore
  ...CodeMirror.resolveMode("text/x-pgsql"),
  identifierQuote: '"',
  hooks: {
    // eslint-disable-next-line
    // @ts-ignore
    '"': CodeMirror.resolveMode("text/x-sqlite")?.hooks['"'],
  },
});

