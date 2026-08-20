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
 * Ex commands live on a process-global vim singleton, so handlers cannot close
 * over a tab -- each mount would overwrite the last, and `:w` would save the
 * wrong tab (#1930). Emitting keeps the table identical everywhere and lets
 * the active tab decide. Tabs that don't support a command don't listen.
 */
export function vimExCommands(trigger: Trigger): VimExCommandConfig {
  return {
    exCommands: [
      { name: "write", prefix: "w", handler: () => trigger(AppEvent.vimWrite) },
      { name: "quit", prefix: "q", handler: () => trigger(AppEvent.closeTab) },
      { name: "qa", prefix: "qa", handler: () => trigger(AppEvent.closeAllTabs) },
      { name: "x", prefix: "x", handler: () => trigger(AppEvent.vimWriteQuit) },
      { name: "wq", prefix: "wq", handler: () => trigger(AppEvent.vimWriteQuit) },
      // Reached from the default <C-p> mapping below, not typed.
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
 * Vim binds <C-p> to "up", swallowing quick search (#3446). Mapped rather than
 * unmapped, because removing a built-in breaks mapclear and noremap. Applied
 * ahead of the user's vimrc, so `nnoremap <C-p> k` takes the key back.
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
