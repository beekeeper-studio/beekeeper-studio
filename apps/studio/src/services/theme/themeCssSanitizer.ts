import type { Root } from "postcss";
import rawLog from "@bksLogger";

const log = rawLog.scope("themeCssSanitizer");

const URL_FUNCTION = /url\(\s*(?:"([^"]*)"?|'([^']*)'?|([^)]*))/gi;
const STRING_URL_FUNCTION = /(?<![\w-])(?:-webkit-)?(?:image-set|image|cross-fade|src)\(/i;
const STRING = /"([^"]*)"?|'([^']*)'?/g;

function decodeCssEscapes(value: string): string {
  return value.replace(
    /\\(?:([0-9a-f]{1,6})[ \t\r\n\f]?|(\r\n|[\s\S]))/gi,
    (_match, hex: string | undefined, char: string) => {
      if (hex) {
        const codePoint = parseInt(hex, 16);
        return codePoint > 0x10ffff ? "�" : String.fromCodePoint(codePoint);
      }
      return /^[\r\n\f]/.test(char) ? "" : char;
    }
  );
}

function isLocalTarget(target: string, allowData: boolean): boolean {
  // URL parsers ignore control characters and read backslashes as slashes.
  // eslint-disable-next-line no-control-regex
  const normalized = target.replace(/[\u0000- ]+/g, "").replace(/\\/g, "/");

  if (normalized.startsWith("//")) {
    return false;
  }
  if (/^data:/i.test(normalized)) {
    return allowData;
  }
  return !/^[a-z][a-z0-9+.-]*:/i.test(normalized);
}

function matchedTargets(value: string, pattern: RegExp): string[] {
  return Array.from(value.matchAll(pattern), (m) => m[1] ?? m[2] ?? m[3] ?? "");
}

function loadsExternalResource(rawValue: string): boolean {
  const value = decodeCssEscapes(rawValue);

  if (matchedTargets(value, URL_FUNCTION).some((t) => !isLocalTarget(t, true))) {
    return true;
  }

  const stringFunction = value.search(STRING_URL_FUNCTION);
  if (stringFunction === -1) {
    return false;
  }

  // These functions take a bare string as a URL, which var() and attr() could supply unseen.
  const args = value.slice(stringFunction);
  return (
    /(?<![\w-])(?:var|attr)\(/i.test(args) ||
    matchedTargets(args, STRING).some((t) => !isLocalTarget(t, true))
  );
}

function importsExternalStylesheet(rawParams: string): boolean {
  const params = decodeCssEscapes(rawParams);
  const targets = [
    ...matchedTargets(params, URL_FUNCTION),
    ...matchedTargets(params, STRING),
  ];
  // A data: stylesheet could carry its own external references past this check.
  return targets.length === 0 || targets.some((t) => !isLocalTarget(t, false));
}

/** Remove anything that would make a theme load files from outside its own folder. */
export function stripExternalResources(root: Root): void {
  root.walk((node) => {
    let external = false;

    if (node.type === "decl") {
      external = loadsExternalResource(node.value);
    } else if (node.type === "rule") {
      external = loadsExternalResource(node.selector);
    } else if (node.type === "atrule") {
      external =
        node.name.toLowerCase() === "import"
          ? importsExternalStylesheet(node.params)
          : loadsExternalResource(node.params);
    }

    if (external) {
      log.warn("Removed external resource from theme CSS:", node.toString());
      node.remove();
    }
  });
}
