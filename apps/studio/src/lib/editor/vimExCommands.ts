import { AppEvent } from "@/common/AppEvent";

export interface VimExCommand {
  name: string;
  prefix: string;
  handler: (...args: any[]) => void;
}

export interface VimExCommandConfig {
  exCommands: VimExCommand[];
}

type Trigger = (event: AppEvent, ...args: any[]) => void;

/**
 * Ex commands live on a process-global vim singleton, so their handlers can't
 * close over a tab: every tab that mounts overwrites the previous tab's
 * handlers, and `:w` ends up saving whichever tab mounted last rather than the
 * one being typed in. Emitting instead keeps the table identical for every
 * tab, and the tab that is actually active decides what to do.
 *
 * Tabs that don't support a command simply don't listen for it, which is how
 * the shell tab stays without `:w`.
 */
export function vimExCommands(trigger: Trigger): VimExCommandConfig {
  return {
    exCommands: [
      { name: "write", prefix: "w", handler: () => trigger(AppEvent.vimWrite) },
      { name: "quit", prefix: "q", handler: () => trigger(AppEvent.closeTab) },
      { name: "qa", prefix: "qa", handler: () => trigger(AppEvent.closeAllTabs) },
      { name: "x", prefix: "x", handler: () => trigger(AppEvent.vimWriteQuit) },
      { name: "wq", prefix: "wq", handler: () => trigger(AppEvent.vimWriteQuit) },
      // Reached from the default <C-p> mapping below rather than typed.
      {
        name: "bksquicksearch",
        prefix: "bksquicksearch",
        handler: () => trigger(AppEvent.quickSearch),
      },
      {
        name: "tabnew",
        prefix: "tabnew",
        handler: (_cm, params) => {
          const name = params?.args?.[0];
          if (name) {
            trigger(AppEvent.newTab, "", name);
          } else {
            trigger(AppEvent.newTab);
          }
        },
      },
    ],
  };
}

/**
 * Vim binds <C-p> to "up" in every mode, which swallowed the app's quick
 * search shortcut once the editor moved to codemirror 6 (#3446). Rather than
 * unmapping it -- codemirror derives which keymap entries are user defined by
 * subtracting the length it recorded at startup, so removing a built-in
 * breaks mapclear and noremap -- point it at the app action instead.
 *
 * These are applied ahead of the user's vimrc, so `nnoremap <C-p> k` in
 * `.beekeeper.vimrc` takes the key back.
 */
export const DEFAULT_VIM_MAPPINGS = [
  {
    mappingMode: "nmap",
    lhs: "<C-p>",
    rhs: ":bksquicksearch<CR>",
    mode: "normal" as const,
    noremap: false,
  },
];
