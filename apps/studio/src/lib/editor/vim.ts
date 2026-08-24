export type VimMode = "normal" | "insert" | "visual";

/** Directives match the ui-kit editor's `vimKeymaps` prop, applied in order. */
export type IMapping = {
  type?: "map";
  lhs: string;
  rhs: string;
  mode?: VimMode;
  noremap?: boolean;
};

export type IUnmapping = {
  type: "unmap";
  lhs: string;
  mode?: VimMode;
};

export type IMapClear = {
  type: "mapclear";
  mode?: VimMode;
};

export type IVimOption = {
  type: "set";
  name: string;
  value: string | boolean;
};

export type VimDirective = IMapping | IUnmapping | IMapClear | IVimOption;

export interface VimrcParseError {
  /** 1-based. */
  line: number;
  text: string;
  reason: string;
}

export interface VimrcParseResult {
  directives: VimDirective[];
  errors: VimrcParseError[];
}

const MAP_COMMANDS: Record<string, { mode?: VimMode; noremap: boolean }> = {
  map: { noremap: false },
  nmap: { mode: "normal", noremap: false },
  imap: { mode: "insert", noremap: false },
  vmap: { mode: "visual", noremap: false },
  noremap: { noremap: true },
  nnoremap: { mode: "normal", noremap: true },
  inoremap: { mode: "insert", noremap: true },
  vnoremap: { mode: "visual", noremap: true },
};

const UNMAP_COMMANDS: Record<string, VimMode | undefined> = {
  unmap: undefined,
  nunmap: "normal",
  iunmap: "insert",
  vunmap: "visual",
};

const MAPCLEAR_COMMANDS: Record<string, VimMode | undefined> = {
  mapclear: undefined,
  nmapclear: "normal",
  imapclear: "insert",
  vmapclear: "visual",
};

const DEFAULT_LEADER = "\\";
const MAPLEADER = /^let\s+(?:g:)?mapleader\s*=\s*(.+)$/;
const LEADER = /<leader>/gi;

function unquote(value: string): string {
  const trimmed = value.trim();
  const quote = trimmed[0];
  if ((quote === '"' || quote === "'") && trimmed.endsWith(quote) && trimmed.length > 1) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseSet(token: string): IVimOption | string {
  if (token.endsWith("!") || token.startsWith("inv")) {
    return "toggling an option is not supported, set it explicitly instead";
  }

  const equals = token.indexOf("=");
  if (equals > 0) {
    return { type: "set", name: token.slice(0, equals), value: token.slice(equals + 1) };
  }

  if (token.startsWith("no") && token.length > 2) {
    return { type: "set", name: token.slice(2), value: false };
  }

  return { type: "set", name: token, value: true };
}

/**
 * Unrecognised lines go to `errors` instead of throwing, so one bad line
 * doesn't cost the user the rest of their config.
 */
export function parseVimrc(vimrcContents: string[]): VimrcParseResult {
  const directives: VimDirective[] = [];
  const errors: VimrcParseError[] = [];
  let leader = DEFAULT_LEADER;

  const fail = (line: number, text: string, reason: string) =>
    errors.push({ line, text, reason });

  vimrcContents.forEach((rawLine, index) => {
    const line = index + 1;
    const text = (rawLine ?? "").trim();

    // Only a leading quote starts a comment. Elsewhere it's part of the
    // mapping, as in the "* register.
    if (!text || text.startsWith('"')) return;

    const mapleader = text.match(MAPLEADER);
    if (mapleader) {
      leader = unquote(mapleader[1]);
      return;
    }

    const [command, ...args] = text.split(/\s+/);

    if (MAP_COMMANDS[command]) {
      const { mode, noremap } = MAP_COMMANDS[command];
      if (args.length < 2) {
        fail(line, text, `${command} expects a key to map and something to map it to`);
        return;
      }

      const lhs = args[0].replace(LEADER, leader);
      const rhs = args.slice(1).join(" ");

      // A recursive mapping containing its own lhs expands forever.
      if (!noremap && rhs.includes(lhs)) {
        fail(
          line,
          text,
          `${lhs} maps to itself, which repeats without end. Use ${command.replace("map", "noremap")} instead`
        );
        return;
      }

      directives.push({ lhs, rhs, mode, noremap });
      return;
    }

    if (command in UNMAP_COMMANDS) {
      if (args.length !== 1) {
        fail(line, text, `${command} expects exactly one key`);
        return;
      }
      directives.push({
        type: "unmap",
        lhs: args[0].replace(LEADER, leader),
        mode: UNMAP_COMMANDS[command],
      });
      return;
    }

    if (command in MAPCLEAR_COMMANDS) {
      if (args.length > 0) {
        fail(line, text, `${command} takes no arguments`);
        return;
      }
      directives.push({ type: "mapclear", mode: MAPCLEAR_COMMANDS[command] });
      return;
    }

    if (command === "set" || command === "se") {
      if (args.length === 0) {
        fail(line, text, "set expects an option name");
        return;
      }
      args.forEach((token) => {
        const option = parseSet(token);
        if (typeof option === "string") {
          fail(line, text, option);
        } else {
          directives.push(option);
        }
      });
      return;
    }

    fail(line, text, `${command} is not a supported command`);
  });

  return { directives: dedupeMappings(directives), errors };
}

/**
 * Later mappings win, and take the later position so an unmap written between
 * the two still runs first. Only mappings collapse; the rest stay in order.
 */
function dedupeMappings(directives: VimDirective[]): VimDirective[] {
  const result: VimDirective[] = [];

  directives.forEach((directive) => {
    if ("type" in directive && directive.type) {
      result.push(directive);
      return;
    }

    const mapping = directive as IMapping;
    const superseded = result.findIndex(
      (candidate) =>
        !("type" in candidate && candidate.type) &&
        (candidate as IMapping).lhs === mapping.lhs &&
        (candidate as IMapping).mode === mapping.mode
    );

    if (superseded !== -1) {
      result.splice(superseded, 1);
    }
    result.push(mapping);
  });

  return result;
}
