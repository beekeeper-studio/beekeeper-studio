export type IMapping = {
  mappingMode: string;
  lhs: string;
  rhs: string;
  mode: string;
};

export interface Config {
  exCommands?: { name: string, prefix: string, handler: () => void }[];
}

export function applyConfig(codeMirrorVimInstance: any, config: Config) {
  const { exCommands } = config;
  if (exCommands) {
    exCommands.forEach(({ name, prefix, handler }) => {
      codeMirrorVimInstance.defineEx(name, prefix, handler);
    });
  }
}

export function setKeybindings(codeMirrorVimInstance: any, mappings: IMapping[]): void {
  for (let j = 0; j < mappings.length; j++) {
    codeMirrorVimInstance.map(
      mappings[j].lhs,
      mappings[j].rhs,
      mappings[j].mode
    );
  }
}

type Clipboard = {
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
    // return this.keyBuffer.join('');
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


