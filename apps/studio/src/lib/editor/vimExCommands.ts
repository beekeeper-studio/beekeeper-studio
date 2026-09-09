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
 * Ex commands are global, so a handler that captured a tab would be overwritten
 * by the next tab to mount and `:w` would save the wrong one (#1930).
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
 * Vim binds <C-p> to "up", which swallowed quick search (#3446). Mapped rather
 * than unmapped, because removing a built-in breaks mapclear and noremap.
 */
export const DEFAULT_VIM_MAPPINGS = [
  {
    lhs: "<C-p>",
    rhs: ":bksquicksearch<CR>",
    mode: "normal" as const,
    noremap: false,
  },
];
