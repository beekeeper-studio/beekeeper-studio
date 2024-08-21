import * as CodeMirrorPlugins from "@/lib/editor/CodeMirrorPlugins";
import { TableOrView } from "../db/models";

export interface EditorMarker {
  from: { line: number; ch: number };
  to: { line: number; ch: number };
  message: string;
  type: "error" | "highlight"; // | "warning"
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
