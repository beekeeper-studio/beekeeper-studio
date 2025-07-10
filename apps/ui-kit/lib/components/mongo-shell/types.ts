import { TextEditorEventMap } from "../text-editor";

export type ShellRunCommandEvent = CustomEvent<{
  command: string
}>;

export interface MongoShellEventMap extends TextEditorEventMap {
  "bks-shell-run-command": ShellRunCommandEvent
}
