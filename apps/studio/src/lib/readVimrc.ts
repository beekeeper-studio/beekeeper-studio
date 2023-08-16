type IMapping = {
  mappingMode: string;
  lhs: string;
  rhs: string;
  mode: string;
};

export function setKeybindingsFromVimrc(codeMirrorVimInstance: any) {
  const keyMappingModes = ["nmap", "imap", "vmap"];
  //const data = fs.readFileSync("./.vimrc", { encoding: 'utf8', flag: 'r'})
  //const dataSplit = data.split("\n")
  const dataSplit: string[] = []; //TODO: Grab this data from the readvimrc electron process

  if (dataSplit.length === 0) {
    return;
  }

  const mappings: IMapping[] = [];

  dataSplit.forEach((line: string) => {
    if (!line) {
      return;
    }
    const words = line.split(" ");
    if (words.length !== 3) {
      console.log(`Unable to parse this command: ${line}.`);
      return;
    }

    const newCommand: IMapping = {
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

    if (keyMappingModes.includes(newCommand.mappingMode) === false) {
      console.log(
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
