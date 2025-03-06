import * as CodeMirrorPlugins from "@/lib/editor/CodeMirrorPlugins";
import { TableOrView } from "../db/models";

export interface EditorRange {
  id?: string
  from: { line: number; ch: number };
  to: { line: number; ch: number };
}

export interface EditorMarker extends EditorRange {
  message?: string;
  element?: HTMLElement;
  onClick?: (event: MouseEvent) => void;
  type: "error" | "highlight" | "custom"; // | "warning"
}

export interface LineGutter {
  line: number;
  type: "changed";
}

export const plugins = {
  autoquote: CodeMirrorPlugins.registerAutoquote,
  autoComplete: CodeMirrorPlugins.registerAutoComplete,
  autoRemoveQueryQuotes: (dialect: string) =>
    CodeMirrorPlugins.registerAutoRemoveQueryQuotes.bind(null, dialect),
  queryMagic: (
    defaultSchemaGetter: () => string,
    tablesGetter: () => TableOrView[]
  ) =>
    CodeMirrorPlugins.registerQueryMagic.bind(
      null,
      defaultSchemaGetter,
      tablesGetter
    ),
};
