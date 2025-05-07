export interface EditorMarker {
  from: { line: number; ch: number };
  to: { line: number; ch: number };
  message?: string;
  element?: HTMLElement;
  onClick?: (event: MouseEvent) => void;
  type: "error" | "highlight" | "custom"; // | "warning"
}
