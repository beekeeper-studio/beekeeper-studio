import { EditorState, StateEffect, StateField } from "@codemirror/state";
import { CompletionContext, CompletionResult } from "@codemirror/autocomplete";
import { EditorView, ViewPlugin } from "@codemirror/view";
import { PromptLineField, PromptSymbolField } from "@beekeeperstudio/ui-kit/mongo-shell/state";
import rawLog from "@bksLogger";

const log = rawLog.scope('MongoHint');

const setGetCompletions = StateEffect.define<(cmd: string) => Promise<string[]>>();

const getCompletions = StateField.define<((cmd: string) => Promise<string[]>) | null>({
  create() {
    return null;
  },
  update(value, tr) {
    for (let e of tr.effects) {
      if (e.is(setGetCompletions)) return e.value
    }
    return value
  }
})

async function completionSource(
  context: CompletionContext
): Promise<CompletionResult | null> {
  const getCompletionsFn = context.state.field(getCompletions);
  const promptLine = context.state.field(PromptLineField) as number;
  const promptSymbol = context.state.field(PromptSymbolField) as string;

  if (!getCompletionsFn) {
    log.warn("Mongo hint called without required data providers: ", getCompletionsFn, promptLine, promptSymbol);
    return null
  }

  const start = context.state.doc.line(promptLine + 1).from + promptSymbol.length;
  const end = context.state.doc.length;

  const cmd = context.state.doc.sliceString(start, end);

  let completions: string[];
  try {
    completions = await getCompletionsFn(cmd);

    if (!completions || completions.length === 0) {
      return null;
    }
  } catch (error) {
    log.error("[completionSource] Error getting completions:", error);
    return null;
  }

  const options = completions.map((c) => ({
    label: c
  }));

  return {
    options,
    from: start
  }
}

export function mongoHintExtension() {
  let view: EditorView;

  const extensions = [
    getCompletions,
    ViewPlugin.fromClass(
      class {
        constructor(v: EditorView) {
          view = v;
        }
      }
    ),
    EditorState.languageData.of(() => [{
      autocomplete: completionSource
    }])
  ];

  function setGetHints(getter: (cmd: string) => Promise<string[]>) {
    if (!view) {
      log.warn("Calling `setGetCompletions` before extension is initialized.");
      return;
    }
    view.dispatch({ effects: setGetCompletions.of(getter)})
  }

  return {
    extensions,
    setGetHints
  };

}
