import Vue from "vue";

export type IMapping = {
  mappingMode: string;
  lhs: string;
  rhs: string;
  mode: string;
};

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

export async function getKeybindingsFromVimrc(): Promise<IMapping[]> {
  const potentialCommands = await readVimrc();

  if (potentialCommands.length === 0) {
    return;
  }

  return createVimCommands(potentialCommands);
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

