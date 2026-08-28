import { parseVimrc } from "../../../../studio/src/lib/editor/vim"

const mapping = (lhs, rhs, mode, noremap = false) => ({ lhs, rhs, mode, noremap })

describe("Vimrc parsing", () => {
  it("parses the map commands into directives", () => {
    const { directives, errors } = parseVimrc([
      "nmap gl $",
      "nmap gh ^",
      "nmap Y y$",
      "nmap J :tabp",
      "nmap K :tabn",
      "vmap K :m '<-2gv=gv",
    ])

    expect(errors).toEqual([])
    expect(directives).toEqual([
      mapping("gl", "$", "normal"),
      mapping("gh", "^", "normal"),
      mapping("Y", "y$", "normal"),
      mapping("J", ":tabp", "normal"),
      mapping("K", ":tabn", "normal"),
      mapping("K", ":m '<-2gv=gv", "visual"),
    ])
  })

  it("keeps the last of two mappings for the same key and mode", () => {
    const { directives } = parseVimrc([
      "nmap gl ^",
      "nmap gl $",
    ])

    expect(directives).toEqual([mapping("gl", "$", "normal")])
  })

  it("lets a later noremap supersede an earlier map for the same key", () => {
    const { directives } = parseVimrc([
      "nmap gl ^",
      "nnoremap gl $",
    ])

    expect(directives).toEqual([mapping("gl", "$", "normal", true)])
  })

  it("treats the same key in different modes as separate mappings", () => {
    const { directives } = parseVimrc([
      "nmap gl ^",
      "vmap gl $",
    ])

    expect(directives).toHaveLength(2)
  })
})

describe("Vimrc parsing: whitespace and comments", () => {
  it("skips blank lines and comments", () => {
    const { directives, errors } = parseVimrc([
      "",
      '" go to the end of the line',
      "   ",
      "nmap gl $",
      '"nmap gh ^',
    ])

    expect(errors).toEqual([])
    expect(directives).toEqual([mapping("gl", "$", "normal")])
  })

  it("accepts tabs and runs of spaces as separators", () => {
    const { directives, errors } = parseVimrc([
      "nmap\tgl\t$",
      "nmap    gh    ^",
      "  nmap Y y$  ",
    ])

    expect(errors).toEqual([])
    expect(directives).toEqual([
      mapping("gl", "$", "normal"),
      mapping("gh", "^", "normal"),
      mapping("Y", "y$", "normal"),
    ])
  })

  it("does not mistake a quote inside a mapping for a comment", () => {
    const { directives, errors } = parseVimrc(['nnoremap y "*y'])

    expect(errors).toEqual([])
    expect(directives).toEqual([mapping("y", '"*y', "normal", true)])
  })
})

describe("Vimrc parsing: noremap", () => {
  it("marks the noremap family as non-recursive", () => {
    const { directives, errors } = parseVimrc([
      "noremap gl $",
      "nnoremap gh ^",
      "inoremap jk <Esc>",
      "vnoremap p P",
    ])

    expect(errors).toEqual([])
    expect(directives).toEqual([
      mapping("gl", "$", undefined, true),
      mapping("gh", "^", "normal", true),
      mapping("jk", "<Esc>", "insert", true),
      mapping("p", "P", "visual", true),
    ])
  })

  // https://github.com/beekeeper-studio/beekeeper-studio/issues/2953
  it("rejects a recursive mapping that contains its own key", () => {
    const { directives, errors } = parseVimrc(['nmap y "*y'])

    expect(directives).toEqual([])
    expect(errors).toHaveLength(1)
    expect(errors[0].line).toEqual(1)
    expect(errors[0].reason).toContain("nnoremap")
  })

  it("allows the same mapping when it is declared non-recursive", () => {
    const { errors } = parseVimrc(['nnoremap y "*y'])
    expect(errors).toEqual([])
  })
})

describe("Vimrc parsing: unmap and mapclear", () => {
  it("parses the unmap family", () => {
    const { directives, errors } = parseVimrc([
      "unmap <C-p>",
      "nunmap gl",
      "iunmap jk",
      "vunmap p",
    ])

    expect(errors).toEqual([])
    expect(directives).toEqual([
      { type: "unmap", lhs: "<C-p>", mode: undefined },
      { type: "unmap", lhs: "gl", mode: "normal" },
      { type: "unmap", lhs: "jk", mode: "insert" },
      { type: "unmap", lhs: "p", mode: "visual" },
    ])
  })

  it("parses the mapclear family", () => {
    const { directives, errors } = parseVimrc(["mapclear", "nmapclear"])

    expect(errors).toEqual([])
    expect(directives).toEqual([
      { type: "mapclear", mode: undefined },
      { type: "mapclear", mode: "normal" },
    ])
  })

  it("keeps unmap in the order it was written", () => {
    const { directives } = parseVimrc([
      "nmap gl $",
      "nunmap gl",
      "nmap gl ^",
    ])

    expect(directives).toEqual([
      { type: "unmap", lhs: "gl", mode: "normal" },
      mapping("gl", "^", "normal"),
    ])
  })

  it("reports unmap without a key", () => {
    const { errors } = parseVimrc(["unmap"])
    expect(errors).toHaveLength(1)
  })
})

describe("Vimrc parsing: set", () => {
  it("parses boolean, negated and valued options", () => {
    const { directives, errors } = parseVimrc([
      "set ignorecase",
      "set nonumber",
      "set tabstop=4",
    ])

    expect(errors).toEqual([])
    expect(directives).toEqual([
      { type: "set", name: "ignorecase", value: true },
      { type: "set", name: "number", value: false },
      { type: "set", name: "tabstop", value: "4" },
    ])
  })

  it("accepts several options on one line", () => {
    const { directives } = parseVimrc(["set ignorecase smartcase"])

    expect(directives).toEqual([
      { type: "set", name: "ignorecase", value: true },
      { type: "set", name: "smartcase", value: true },
    ])
  })

  it("reports a toggle it cannot express", () => {
    const { errors } = parseVimrc(["set ignorecase!"])
    expect(errors).toHaveLength(1)
  })

  it("reports set with no option", () => {
    const { errors } = parseVimrc(["set"])
    expect(errors).toHaveLength(1)
  })
})

describe("Vimrc parsing: leader", () => {
  it("expands <leader> to a backslash by default", () => {
    const { directives } = parseVimrc(["nmap <leader>w :w<CR>"])

    expect(directives).toEqual([mapping("\\w", ":w<CR>", "normal")])
  })

  it("honours mapleader", () => {
    const { directives } = parseVimrc([
      'let mapleader = ","',
      "nmap <leader>w :w<CR>",
    ])

    expect(directives).toEqual([mapping(",w", ":w<CR>", "normal")])
  })

  it("honours g:mapleader and an unspaced assignment", () => {
    const { directives } = parseVimrc([
      "let g:mapleader=' '",
      "nmap <Leader>w :w<CR>",
    ])

    expect(directives).toEqual([mapping(" w", ":w<CR>", "normal")])
  })

  it("only applies mapleader to mappings that follow it", () => {
    const { directives } = parseVimrc([
      "nmap <leader>a :qa<CR>",
      'let mapleader = ","',
      "nmap <leader>b :q<CR>",
    ])

    expect(directives.map((d) => d.lhs)).toEqual(["\\a", ",b"])
  })
})

describe("Vimrc parsing: errors", () => {
  it("reports an unknown command and keeps the rest", () => {
    const { directives, errors } = parseVimrc([
      "nmap gl $",
      "colorscheme gruvbox",
      "nmap gh ^",
    ])

    expect(directives).toHaveLength(2)
    expect(errors).toHaveLength(1)
    expect(errors[0].line).toEqual(2)
    expect(errors[0].text).toEqual("colorscheme gruvbox")
  })

  it("reports a mapping that is missing its right hand side", () => {
    const { directives, errors } = parseVimrc(["nmap gl"])

    expect(directives).toEqual([])
    expect(errors).toHaveLength(1)
  })

  it("does not throw on malformed input", () => {
    expect(() => parseVimrc([null, undefined, "", "!!!"])).not.toThrow()
  })
})
