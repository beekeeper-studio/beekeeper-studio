import Vue from "vue";

export type IMapping = {
  mappingMode: string;
  lhs: string;
  rhs: string;
  mode: string;
};

interface Config {
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

async function readVimrc(pathToVimrc?: string): Promise<string[]> {
  const userDirectory = window.platformInfo.userDirectory;
  const vimrcPath = await Vue.prototype.$util.send('file/pathJoin', { paths: [pathToVimrc ?? userDirectory, ".beekeeper.vimrc"]});
  if (await Vue.prototype.$util.send('file/exists', { path: vimrcPath })) {
    const data = await Vue.prototype.$util.send('file/read', { path: vimrcPath, options: { encoding: 'utf-8', flag: 'r'}});
    const dataSplit = data.split("\n");
    return dataSplit;
  }
  return [];
}

export async function setKeybindingsFromVimrc(codeMirrorVimInstance: any): Promise<void> {
  const potentialCommands = await readVimrc();

  if (potentialCommands.length === 0) {
    return;
  }

  const mappings = createVimCommands(potentialCommands);

  for (let j = 0; j < mappings.length; j++) {
    codeMirrorVimInstance.map(
      mappings[j].lhs,
      mappings[j].rhs,
      mappings[j].mode
    );
  }
}

export function createVimCommands(vimrcContents: string[]): IMapping[] {
  const keyMappingModes = ["nmap", "imap", "vmap"];
  const mappings: IMapping[] = [];

  vimrcContents.forEach((line: string) => {
    if (!line) {
      return;
    }

    const words = line.split(" ");
    let newCommand: IMapping;
    if (words.length > 3) {
      newCommand = {
        mappingMode: words[0],
        lhs: words[1],
        rhs: words.slice(2).join(" "),
        mode:
          words[0] === "nmap"
            ? "normal"
            : words[0] === "imap"
            ? "insert"
            : "visual",
      };
    } else if (words.length !== 3) {
      console.error(`Unable to parse this command: ${line}.`);
      return;
    } else {
      newCommand = {
        mappingMode: words[0],
        lhs: words[1],
        rhs: words[2],
        mode:
          words[0] === "nmap"
            ? "normal"
            : words[0] === "imap"
            ? "insert"
            : "visual",
      };
    }

    if (keyMappingModes.includes(newCommand.mappingMode) === false) {
      console.error(
        `Sorry, ${newCommand.mappingMode} type is invalid and needs to be one of the following: ${keyMappingModes.join(
          ", "
        )}`
      );
      return;
    }

    const currEntry = mappings.find((mapping) => mapping.lhs === newCommand.lhs && mapping.mappingMode === newCommand.mappingMode)
    if (currEntry) {
      const index = mappings.indexOf(currEntry)
      mappings[index] = newCommand
    } else {
      mappings.push(newCommand);
    }
  });

  return mappings;
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


