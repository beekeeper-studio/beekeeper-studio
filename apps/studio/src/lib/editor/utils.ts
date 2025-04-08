import * as CodeMirrorPlugins from "@/lib/editor/CodeMirrorPlugins";
import { TableOrView } from "../db/models";
import CodeMirror from "codemirror";

export interface EditorRange {
  id?: string;
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

/** Checks if `target` is within `container` */
export function isPositionWithin(
  target: { from: CodeMirror.Position; to: CodeMirror.Position },
  container: { from: CodeMirror.Position; to: CodeMirror.Position }
) {
  return (
    CodeMirror.cmpPos(target.from, container.from) >= 0 &&
    CodeMirror.cmpPos(target.to, container.to) <= 0
  );
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
