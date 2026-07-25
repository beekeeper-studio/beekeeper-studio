import type { ConfigEntryDetailWarning } from "./BksConfigProvider";

// Pure, node-free helpers for the config editor window. These bridge the gap
// between the config validators, which speak in dotted paths, and the text
// editor, which needs line numbers.

export interface IniProblem {
  /** 0-based line number in the source text. */
  line: number;
  /** 0-based column where the problem starts. */
  from: number;
  /** 0-based column where the problem ends. */
  to: number;
  message: string;
  severity: "error" | "warning";
}

const COMMENT = /^\s*[;#]/;
const BLANK = /^\s*$/;
const SECTION = /^\s*\[([^\]]*)\]\s*(?:[;#].*)?$/;

/**
 * Report structural problems in INI text.
 *
 * The `ini` package never throws — it happily turns a bare `foo` line into
 * `foo = true` — so anything resembling a parse error has to be found here.
 */
export function lintIniSyntax(text: string): IniProblem[] {
  const problems: IniProblem[] = [];
  const lines = text.split("\n");

  let section = "";
  let seen = new Set<string>();

  lines.forEach((raw, line) => {
    const stripped = raw.replace(/\r$/, "");

    if (BLANK.test(stripped) || COMMENT.test(stripped)) return;

    const trimmedStart = stripped.length - stripped.trimStart().length;

    const sectionMatch = SECTION.exec(stripped);
    if (sectionMatch) {
      section = sectionMatch[1].trim();
      seen = new Set();
      if (section === "") {
        problems.push({
          line,
          from: trimmedStart,
          to: stripped.length,
          message: "Empty section name.",
          severity: "error",
        });
      }
      return;
    }

    if (stripped.trimStart().startsWith("[")) {
      problems.push({
        line,
        from: trimmedStart,
        to: stripped.length,
        message: "Unclosed section header. Expected a closing `]`.",
        severity: "error",
      });
      return;
    }

    const eq = stripped.indexOf("=");
    if (eq === -1) {
      problems.push({
        line,
        from: trimmedStart,
        to: stripped.length,
        message:
          "Expected `key = value` or `[section]`. Prefix the line with `#` to comment it out.",
        severity: "error",
      });
      return;
    }

    const key = stripped.slice(0, eq).trim();
    if (key === "") {
      problems.push({
        line,
        from: trimmedStart,
        to: eq + 1,
        message: "Missing key name before `=`.",
        severity: "error",
      });
      return;
    }

    // Repeating an array key is how you add entries to it, so only scalar keys
    // can be duplicates.
    if (!key.endsWith("[]")) {
      if (seen.has(key)) {
        problems.push({
          line,
          from: trimmedStart,
          to: trimmedStart + key.length,
          message: `Duplicate key \`${key}\`${
            section ? ` in [${section}]` : ""
          }. The last value wins.`,
          severity: "warning",
        });
      }
      seen.add(key);
    }
  });

  return problems;
}

/**
 * Map each key in the text to the line it is declared on, using the same dotted
 * paths the config validators produce. Section headers are indexed too, so a
 * warning about an unrecognized section can be located.
 *
 * Array keys (`activityEvents[]`) index under their bare name, matching the
 * parsed config. Repeated array keys map to their first occurrence.
 */
export function buildIniLineIndex(text: string): Map<string, number> {
  const index = new Map<string, number>();
  const lines = text.split("\n");

  let section = "";

  lines.forEach((raw, line) => {
    const stripped = raw.replace(/\r$/, "");

    if (BLANK.test(stripped) || COMMENT.test(stripped)) return;

    const sectionMatch = SECTION.exec(stripped);
    if (sectionMatch) {
      section = sectionMatch[1].trim();
      if (section && !index.has(section)) index.set(section, line);
      return;
    }

    const eq = stripped.indexOf("=");
    if (eq === -1) return;

    const key = stripped.slice(0, eq).trim().replace(/\[\s*\]$/, "");
    if (key === "") return;

    const path = section ? `${section}.${key}` : key;
    if (!index.has(path)) index.set(path, line);
  });

  return index;
}

function describe(warning: ConfigEntryDetailWarning): string {
  switch (warning.type) {
    case "unrecognized-key":
      return warning.section === warning.path
        ? `Unrecognized section [${warning.section}].`
        : `Unrecognized key \`${warning.path}\`.`;
    case "deprecated-key":
      return `\`${warning.path}\` is deprecated and no longer has any effect.`;
    case "system-user-conflict":
      return `\`${warning.path}\` is set by the system config and can't be overridden here.`;
    case "unknown-allow-plugin":
      return `\`${warning.value}\` is not a bundled plugin ID.`;
    default:
      return `Problem with \`${warning.path}\`.`;
  }
}

export interface LocatedProblem extends IniProblem {
  /** Present when the problem came from a config validator. */
  warning?: ConfigEntryDetailWarning;
}

/**
 * Attach line positions to validator warnings. Warnings whose key can't be
 * found in the text (for example a key inherited from an included default) are
 * reported on line 0 so they still surface in the problems list.
 */
export function locateWarnings(
  warnings: ConfigEntryDetailWarning[],
  text: string,
  index = buildIniLineIndex(text)
): LocatedProblem[] {
  const lines = text.split("\n");

  return warnings.map((warning) => {
    const line = index.get(warning.path) ?? index.get(warning.section) ?? 0;
    const raw = (lines[line] ?? "").replace(/\r$/, "");
    const from = raw.length - raw.trimStart().length;
    return {
      line,
      from,
      to: Math.max(raw.length, from + 1),
      message: describe(warning),
      severity: "warning" as const,
      warning,
    };
  });
}

/** Everything wrong with the given user config text, in line order. */
export function lintUserConfig(
  text: string,
  warnings: ConfigEntryDetailWarning[]
): LocatedProblem[] {
  const problems: LocatedProblem[] = [
    ...lintIniSyntax(text),
    ...locateWarnings(warnings, text),
  ];
  return problems.sort((a, b) => a.line - b.line || a.from - b.from);
}
