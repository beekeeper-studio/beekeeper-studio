export abstract class TextEditorPlugin {
  abstract name: string;
  abstract initialize(editor: CodeMirror.Editor): void;
  abstract destroy(): void;
}
