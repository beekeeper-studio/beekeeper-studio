import { readVimrc } from "@/common/utils";

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
      codeMirrorVimInstance.defineEx(prefix, name, handler);
    });
  }
}

export function setKeybindingsFromVimrc(codeMirrorVimInstance: any) {
  const potentialCommands = readVimrc();

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
