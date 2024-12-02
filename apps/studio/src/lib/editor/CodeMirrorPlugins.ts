import type CodeMirror from "codemirror";
import MagicColumnBuilder from "@/lib/magic/MagicColumnBuilder";
import electronLog from "electron-log";
import { TableOrView } from "../db/models";
import _ from "lodash";

export function queryMagicHandler(
  instance: CodeMirror.Editor,
  log: electronLog.LogFunctions,
  defaultSchemaGetter: () => string,
  tablesGetter: () => TableOrView[]
) {
  const toPosition = _.clone(instance.getCursor());
  if (toPosition.ch >= 1) {
    toPosition.ch -= 1;
    const wordObj = instance.findWordAt(toPosition);
    const word = instance.getRange(wordObj.anchor, wordObj.head);
    if (word.includes("__")) {
      const defSchema = defaultSchemaGetter();
      const suggestions = MagicColumnBuilder.suggestWords(
        word,
        tablesGetter(),
        defSchema
      );
      log.debug("suggestions for ", word, suggestions);

      // const charsBack = word.split('').reverse().findIndex((c) => c === '_')

      if (!suggestions) return;

      const suggestionList = suggestions.map((s) => {
        const parts = word.split("__");
        parts[parts.length - 1] = s;
        return {
          text: parts.join("__"),
          displayText: s,
        };
      });

      // @ts-expect-error not fully typed
      instance.showHint({
        hint: () => {
          return {
            list: suggestionList,
            from: wordObj.anchor,
            to: wordObj.head,
          };
        },
        closeCharacters: /[\s()[\]{};:_>,]/,
        completeSingle: false,
        alignWithWord: false,
      });
    }
  } else {
    // do nothing
  }
}

export function registerQueryMagic(
  defaultSchemaGetter: () => string,
  tablesGetter: () => TableOrView[],
  instance: CodeMirror.Editor
) {
  const log = electronLog.scope("CodeMirrorPlugins:QueryMagic");
  const handler = queryMagicHandler.bind(
    null,
    instance,
    log,
    defaultSchemaGetter,
    tablesGetter
  );
  instance.on("keyup", handler);
  return () => instance.off("keyup", handler);
}

export const queryMagic = (
  defaultSchemaGetter: () => string,
  tablesGetter: () => TableOrView[]
) =>
  registerQueryMagic.bind(
    null,
    defaultSchemaGetter,
    tablesGetter
  )
