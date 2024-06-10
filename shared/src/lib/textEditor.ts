export interface EditorMarker {
  from: { line: number; ch: number };
  to: { line: number; ch: number };
  message: string;
  type: "error" | "highlight"; // | "warning"
}
