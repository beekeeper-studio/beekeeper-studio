import _ from "lodash";

export type IMapping = {
  mappingMode?: string;
  lhs: string;
  rhs: string;
  /** 'normal', 'insert' or 'visual'. Omitted means every mode. */
  mode?: string;
  /**
   * When true the mapping is non-recursive, i.e. `nnoremap` rather than
   * `nmap`. Recursive mappings whose rhs contains their own lhs loop forever,
   * so anything referencing a register or the lhs itself wants this.
   */
  noremap?: boolean;
};

export type IUnmapping = {
  type: "unmap";
  lhs: string;
  mode?: string;
};

export type IMapClear = {
  type: "mapclear";
  mode?: string;
};

export type IVimOption = {
  type: "set";
  name: string;
  /** `true`/`false` for boolean options, a string for `set name=value`. */
  value: string | boolean;
};

/**
 * One entry of the `vimKeymaps` prop. A bare mapping object (no `type`) is
 * treated as a `map`, so callers written against the older array-of-mappings
 * shape keep working unchanged.
 */
export type VimDirective =
  | (IMapping & { type?: "map" })
  | IUnmapping
  | IMapClear
  | IVimOption;

export interface Config {
  exCommands?: { name: string, prefix: string, handler: (...args: any[]) => void }[];
}

export function applyConfig(codeMirrorVimInstance: any, config: Config) {
  const { exCommands } = config;
  if (exCommands) {
    exCommands.forEach(({ name, prefix, handler }) => {
      codeMirrorVimInstance.defineEx(name, prefix, handler);
    });
  }
}

function modeArgs(mode?: string): string[] {
  // codemirror's map/unmap treat a missing context as "every mode", and it
  // distinguishes that from an explicit one by argument count.
  return mode ? [mode] : [];
}

function applyDirective(vim: any, directive: VimDirective): void {
  const type = ("type" in directive && directive.type) || "map";

  switch (type) {
    case "map": {
      const mapping = directive as IMapping;
      const fn = mapping.noremap ? vim.noremap : vim.map;
      fn.call(vim, mapping.lhs, mapping.rhs, ...modeArgs(mapping.mode));
      break;
    }
    case "unmap": {
      const unmapping = directive as IUnmapping;
      vim.unmap(unmapping.lhs, ...modeArgs(unmapping.mode));
      break;
    }
    case "mapclear":
      vim.mapclear(...modeArgs((directive as IMapClear).mode));
      break;
    case "set": {
      const option = directive as IVimOption;
      vim.setOption(option.name, option.value);
      break;
    }
  }
}

export function setKeybindings(codeMirrorVimInstance: any, directives: VimDirective[]): void {
  for (const directive of directives) {
    try {
      applyDirective(codeMirrorVimInstance, directive);
    } catch (e) {
      // One bad directive must not take the rest of the vimrc down with it.
      console.error("Could not apply vim directive", directive, e);
    }
  }
}

export type Clipboard = {
  writeText(text: string, notify?: boolean): void
  readText(): string
}

export class Register {
  keyBuffer: string[];
  insertModeChanges: Array<any> = [];
  searchQueries: Array<any> = []
  linewise = false;
  blockwise = false;
  clipboard: Clipboard;

  constructor(clipboard: Clipboard) {
    this.clipboard = clipboard;
    this.clear();
    this.keyBuffer = [''];
  }

  setText(text: string, linewise: boolean, blockwise: boolean) {
    this.keyBuffer = [text || ''];
    this.linewise = !!linewise;
    this.blockwise = !!blockwise;
    this.clipboard.writeText(text, false);
  }

  pushText(text: string, linewise: boolean) {
    if (linewise) {
      if (!this.linewise) {
        this.keyBuffer.push('\n');
      }
      this.linewise = true;
    }
    this.keyBuffer.push(text);
    this.clipboard.writeText(this.keyBuffer.join(' '), false)
  }

  pushInsertModeChanges(changes: any) {
    this.insertModeChanges.push(this.createInsertModeChanges(changes))
  }

  pushSearchQuery(query: string) {
    this.searchQueries.push(query);
  }

  clear() {
    this.keyBuffer = [];
    this.insertModeChanges = [];
    this.searchQueries = [];
    this.linewise = false;
  }

  toString() {
    return this.clipboard.readText();
  }

  private createInsertModeChanges(c: any) {
    if (c) {
      // Copy construction
      return {
        changes: c.changes,
        expectCursorActivityForChange: c.expectCursorActivityForChange
      };
    }
    return {
      // Change list
      changes: [],
      // Set to true on change, false on cursorActivity.
      expectCursorActivityForChange: false
    };
  }
}

/**
 * Mappings live on the global Vim singleton, not on an editor instance, and
 * every mapping is pushed onto one shared keymap. Applying the same config on
 * each keymap reconfigure would stack duplicates, so remember what is already
 * applied and only touch the singleton when it actually changes.
 */
let appliedKeymapSignature: string | null = null;
let appliedMappings: { lhs: string; mode?: string }[] = [];

/** Exported for tests. */
export function resetAppliedKeymaps(): void {
  appliedKeymapSignature = null;
  appliedMappings = [];
}

function applyKeymaps(vim: any, directives: VimDirective[]): void {
  const signature = JSON.stringify(directives);
  if (signature === appliedKeymapSignature) return;

  // Undo only the mappings added here. codemirror records its keymap's length
  // once at startup and derives "which entries are user defined" by
  // subtracting it, so removing anything that was there originally leaves that
  // arithmetic negative and breaks both mapclear and noremap lookups.
  // mapclear() is unusable for the same reason.
  appliedMappings.forEach(({ lhs, mode }) => {
    try {
      vim.unmap(lhs, ...modeArgs(mode));
    } catch (e) {
      console.error("Could not remove vim mapping", lhs, e);
    }
  });

  setKeybindings(vim, directives);

  appliedMappings = directives
    .filter((directive): directive is IMapping => !("type" in directive && directive.type))
    .map(({ lhs, mode }) => ({ lhs, mode }));

  appliedKeymapSignature = signature;
}

export function extendVimOnCodeMirror(
  codeMirrorVimInstance: any,
  vimConfig?: Config,
  vimKeymaps: VimDirective[] = [],
  clipboard?: Clipboard
) {
  if (!codeMirrorVimInstance) {
    console.error("Could not find code mirror vim instance");
    return;
  }

  if (vimConfig) {
    applyConfig(codeMirrorVimInstance, vimConfig);
  }

  if (_.isArray(vimKeymaps)) {
    applyKeymaps(codeMirrorVimInstance, vimKeymaps);
  } else {
    console.error("vimKeymaps must be an array");
  }

  // The * register is global and can only be defined once: codemirror throws
  // on a second attempt and the first definition sticks for the rest of the
  // session. Registering without a clipboard would therefore leave "*y and
  // "*p permanently broken for every editor on the page, so wait for an
  // editor that actually has one.
  if (clipboard) {
    try {
      codeMirrorVimInstance.defineRegister("*", new Register(clipboard));
    } catch (e) {
      // Already defined, which is the common case on the second editor.
    }
  }
}
