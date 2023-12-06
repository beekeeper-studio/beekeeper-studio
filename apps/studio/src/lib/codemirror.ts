import CodeMirror from "codemirror";

export function autoquoteHandler(
  instance: CodeMirror.Editor,
  changeObj: CodeMirror.EditorChangeCancellable
) {
  if (!instance.getOption("mode").includes("pgsql")) return;

  // eslint-disable-next-line
  // @ts-ignore
  const { to, from, origin, text } = changeObj;

  // eslint-disable-next-line
  // @ts-ignore
  const keywords = CodeMirror.resolveMode(instance.getOption("mode")).keywords;

  // quote names when needed
  if (origin === "complete" && keywords[text[0].toLowerCase()] != true) {
    // eslint-disable-next-line
    // @ts-ignore
    const alias = instance.activeAlias;
    const names = text[0]
      .match(/("[^"]*"|[^.]+)/g)
      .map((n) => (/^\d/.test(n) && n !== alias ? `"${n}"` : n))
      .map((n) =>
        /[^a-z0-9_]/.test(n) && !/"/.test(n) && n !== alias ? `"${n}"` : n
      )
      .join(".");

    changeObj.update(from, to, [names]);
  }
}

export function registerAutoquote(
  instance: CodeMirror.Editor,
  onBeforeChange?: (
    instance: CodeMirror.Editor,
    changeObj: CodeMirror.EditorChangeCancellable
  ) => void
) {
  instance.on("beforeChange", onBeforeChange ?? autoquoteHandler);
}

export function unregisterAutoquote(
  instance: CodeMirror.Editor,
  onBeforeChange?: (
    instance: CodeMirror.Editor,
    changeObj: CodeMirror.EditorChangeCancellable
  ) => void
) {
  instance.off("beforeChange", onBeforeChange ?? autoquoteHandler);
}
