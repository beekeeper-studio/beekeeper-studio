export interface MenuOption {
  name: string;
  handler: Function;
  shortcut: string;
  write: boolean;
}

export abstract class TextEditorPlugin {
  abstract name: string;
  abstract initialize(editor: CodeMirror.Editor): void;
  abstract destroy(): void;
  beforeOpeningContextMenu?(
    event: MouseEvent,
    menuOptions: MenuOption[]
  ): void | false | MenuOption[];
}
