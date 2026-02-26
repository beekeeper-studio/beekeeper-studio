import _ from "lodash";
import { recurse } from "./helpers";
import { TaggedString } from "@/common/bksConfig/BksConfigProvider";

const TAG_RE = /^(\w+)\s*:\s*(.+)$/;

/**
 * Parses a single tagged value string like `"f11, mac: cmd+ctrl+f"` into
 * a structured object like `{ default: "f11", mac: "cmd+ctrl+f" }`.
 *
 * Parts without a tag are ignored.
 */
function parseValue(value: string): TaggedString | string {
  const parts = value.split(",").map((s) => s.trim());
  const result: Record<string, string> = {};

  for (const part of parts) {
    const match = TAG_RE.exec(part);
    if (match) {
      const [, tag, val] = match;
      result[tag] = val.trim();
    } else {
      result["default"] = part;
    }
  }

  if (Object.keys(result).length === 1 && result.default) {
    return result.default;
  }

  return { ...result, $$type: "taggedString" };
}

/**
 * Transforms string values like `"f11, mac: cmd+ctrl+f"` into structured
 * objects like `{ default: "f11", mac: "cmd+ctrl+f" }`.
 *
 * If tag doesn't exist, it won't be transformed.
 */
export function parseTags(obj: object): void {
  for (const { key, value, parent } of recurse(obj)) {
    if (Array.isArray(value)) {
      parent[key] = value.map((v) =>
        typeof v === "string" ? parseValue(v) : v
      );
    } else if (typeof value === "string") {
      parent[key] = parseValue(value);
    }
  }
}

export function isTaggedString(value: unknown): value is TaggedString {
  return _.isObject(value) && (value as TaggedString).$$type === "taggedString";
}
