import _ from "lodash";

export type IMapping = {
  lhs: string;
  rhs: string;
  /** 'normal', 'insert' or 'visual'. Omitted means every mode. */
  mode?: string;
  /** `nnoremap` rather than `nmap`. */
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
  value: string | boolean;
};

/** A bare mapping (no `type`) is a `map`, keeping the older prop shape valid. */
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

// codemirror distinguishes "every mode" from an explicit one by argument count.
function modeArgs(mode?: string): string[] {
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

// Mappings live on the global Vim singleton and stack up, so only touch it
// when the config actually changes.
let appliedKeymapSignature: string | null = null;
let appliedMappings: { lhs: string; mode?: string }[] = [];

function applyKeymaps(vim: any, directives: VimDirective[]): void {
  const signature = JSON.stringify(directives);
  if (signature === appliedKeymapSignature) return;

  // Only remove mappings added here. Codemirror spots user mappings by
  // keymap length, so removing a built-in breaks mapclear and noremap.
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

  // The * register is global and sticks to whoever defines it first, so wait
  // for an editor that actually has a clipboard.
  if (clipboard) {
    try {
      codeMirrorVimInstance.defineRegister("*", new Register(clipboard));
    } catch (e) {
      // Already defined.
    }
  }
}
