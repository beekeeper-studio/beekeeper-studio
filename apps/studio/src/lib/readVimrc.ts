import { readVimrc } from "@/common/utils";

type IMapping = {
  mappingMode: string;
  lhs: string;
  rhs: string;
  mode: string;
};

export default function setKeybindingsFromVimrc(codeMirrorVimInstance: any) {
  const keyMappingModes = ["nmap", "imap", "vmap"];
  const potentialCommands = readVimrc();

  if (potentialCommands.length === 0) {
    return;
  }

  const mappings: IMapping[] = [];

  potentialCommands.forEach((line: string) => {
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
        `Sorry, type needs to be one of the following: ${keyMappingModes.join(
          ", "
        )}`
      );
      return;
    }

    mappings.push(newCommand);
  });

  for (let j = 0; j < mappings.length; j++) {
    codeMirrorVimInstance.map(
      mappings[j].lhs,
      mappings[j].rhs,
      mappings[j].mode
    );
  }
}
