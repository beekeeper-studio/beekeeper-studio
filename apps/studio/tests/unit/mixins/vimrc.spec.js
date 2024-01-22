import { createVimCommands } from "../../../../studio/src/lib/readVimrc"

describe("Vimrc Parsing", () => {
  it("Should parse all the commands here, and supply all the IMapping commands to be sent into the setKeybindingsFromVimrc", () => {
    const vimrcSampleContent = [
      "nmap gl $",
      "nmap gh ^",
      "nmap Y y$",
      "nmap J :tabp",
      "nmap K :tabn"
    ];

    const expected = {
      gl: { mappingMode: "nmap", lhs: "gl", rhs: "$", mode: "normal" },
      gh: { mappingMode: "nmap", lhs: "gh", rhs: "^", mode: "normal" },
      Y: { mappingMode: "nmap", lhs: "Y", rhs: "y$", mode: "normal" },
      J: { mappingMode: "nmap", lhs: "J", rhs: ":tabp", mode: "normal" },
      K: { mappingMode: "nmap", lhs: "K", rhs: ":tabn", mode: "normal" },
    }

    const commands = createVimCommands(vimrcSampleContent);

    commands.forEach((command) => {
      expect(command).toEqual(expected[command.lhs])
    });
  })
})

describe("Vimrc Parsing", () => {
  it("Should parse all the commands here, and skip the invalid ones, and supply all the IMapping commands to be sent into the setKeybindingsFromVimrc", () => {
    const vimrcSampleContent = [
      "nmap gl $",
      "nmap gh ^",
      "nmap Y y$",
      "i l :test", //Not a valid command because i is not a valid mapping mode
      "nnoremap <leader>l :test", //Not a valid command because nnoremap is not a current valid mapping mode, but it should be in the future.
    ];

    const expected = {
      gl: { mappingMode: "nmap", lhs: "gl", rhs: "$", mode: "normal" },
      gh: { mappingMode: "nmap", lhs: "gh", rhs: "^", mode: "normal" },
      Y: { mappingMode: "nmap", lhs: "Y", rhs: "y$", mode: "normal" },
    }

    const commands = createVimCommands(vimrcSampleContent);

    commands.forEach((command) => {
      expect(command).toEqual(expected[command.lhs])
    });
  })
})

describe("Vimrc Parsing", () => {
  it("Should parse all the commands here, and return no valid commands to be passed into codemirror", () => {
    const vimrcSampleContent = [
      "i l :test", //Not a valid command because i is not a valid mapping mode
      "nnoremap <leader>l :test", //Not a valid command because nnoremap is not a current valid mapping mode, but it should be in the future.
    ];

    const commands = createVimCommands(vimrcSampleContent);
    expect(commands.length).toEqual(0);
  })
})
