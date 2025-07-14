import { json } from "@codemirror/lang-json";
import { html } from "@codemirror/lang-html";
import { javascript } from "@codemirror/lang-javascript";
import { Compartment } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

export type LanguageId = "json" | "html" | "javascript";

const languageCompartment = new Compartment();

const languageMap = {
  json,
  html,
  javascript,
};

export function language(languageId?: LanguageId) {
  const lang = languageMap[languageId];
  return languageCompartment.of(lang ? lang() : []);
}

export function applyLanguageId(view: EditorView, languageId?: LanguageId) {
  const lang = languageMap[languageId];
  view.dispatch({
    effects: languageCompartment.reconfigure(lang ? lang() : []),
  });
}
