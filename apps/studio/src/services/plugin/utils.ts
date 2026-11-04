import type { KeybindingTarget } from "@/types";
import type { BksConfig } from "@/common/bksConfig/BksConfigProvider";
import { Manifest, ManifestV0, ManifestV1, PluginMenuItem, PluginView } from "./types";
import { Tokens } from "marked";
import _ from "lodash";
import rawLog from "@bksLogger";

const log = rawLog.scope("plugin/utils");

export function mapViewsAndMenuFromV0ToV1(manifest: ManifestV0): {
  views: PluginView[];
  menu: PluginMenuItem[];
} {

  let views: PluginView[];

  if (!manifest.capabilities) {
    log.error(`missing capabilities for ${manifest.id}`)
    views = []
  } else if (_.isArray(manifest.capabilities.views)) {
    log.error(`manifestVersion: 1 is required to use view arrays, plugin ${manifest.id} not loading any views`)
    views = [];
  } else {
    views = manifest.capabilities?.views?.tabTypes?.map<PluginView>(
      (tabType) => ({
        id: tabType.id,
        name: tabType.name,
        type: tabType.kind.includes("shell") ? "shell-tab" : "base-tab",
        entry: tabType.entry,
      })
    ) ?? [];
    if (views.length === 0) {
      log.warn(`No views registered with plugin ${manifest.id}`)
    }
  }

  let menu: PluginMenuItem[] = [];
  if (manifest.capabilities && _.isArray(manifest.capabilities.menu) && manifest.capabilities.menu.length > 0) {
    menu = manifest.capabilities.menu;
  } else {
    menu = views.map((view) => ({
      command: `${view.id}-new-tab-dropdown`,
      name: `New ${manifest.name}`,
      view: view.id,
      placement: "newTabDropdown",
    }));
  }
  return { views, menu };
}

export function isManifestV0(m: Manifest): m is ManifestV0 {
  return m.manifestVersion === undefined || m.manifestVersion === 0;
}

export function getParsedKeybinding(
  bksConfig: BksConfig,
  keyPath: string,
  target: KeybindingTarget
) {
  try {
    const keybindings = bksConfig.getKeybindings(target, keyPath);
    if (keybindings) {
      return typeof keybindings === "string"
        ? keybindings
        : keybindings[0];
    }
  } catch (e) {
    log.error(e);
  }
  return undefined;
}

/**
 * Converts a manifest (v0 or v1) to ManifestV1 format.
 * If the manifest is already v1, returns it as-is.
 * If the manifest is v0, converts the legacy views format to v1.
 */
export function convertToManifestV1(manifest: Manifest): ManifestV1 {
  if (!isManifestV0(manifest)) {
    return manifest;
  }

  const { views, menu } = mapViewsAndMenuFromV0ToV1(manifest);

  return {
    ...manifest,
    manifestVersion: 1,
    capabilities: {
      ...manifest.capabilities,
      views,
      menu,
    },
  };
}

// this gets around githubs rate limiting
export function getPluginAvatarUrl(
  plugin: { repo?: string },
  size = 80
): string | null {
  const owner = plugin.repo?.split("/")[0];
  return owner ? `https://github.com/${owner}.png?size=${size}` : null;
}


function resolveRepoUrl(url: string, base: string): string {
  if (!url || url.startsWith("#") || url.startsWith("//") || /^[a-z][a-z0-9+.-]*:/i.test(url)) {
    return url;
  }
  // A leading slash means the repo root on GitHub, not the host root
  return new URL(url.replace(/^\/+/, ""), base).toString();
}

export function markedRepoUrlRewriter(repo: string) {
  const rawBase = `https://raw.githubusercontent.com/${repo}/HEAD/`;
  const blobBase = `https://github.com/${repo}/blob/HEAD/`;
  const htmlAttr = /(<(img|video|source|a)\b[^>]*?\b(src|href)\s*=\s*)(["'])(.*?)\4/gi;

  return (token: Tokens.Generic) => {
    if (token.type === "image") {
      token.href = resolveRepoUrl(token.href, rawBase);
    } else if (token.type === "link") {
      token.href = resolveRepoUrl(token.href, blobBase);
    } else if (token.type === "html") {
      token.text = token.text.replace(htmlAttr, (_match, prefix, tag, _attr, quote, url) => {
        const base = tag.toLowerCase() === "a" ? blobBase : rawBase;
        return `${prefix}${quote}${resolveRepoUrl(url, base)}${quote}`;
      });
    }
  };
}

const videoAttachmentUrl = /^https:\/\/github\.com\/(user-attachments\/assets|[^/]+\/[^/]+\/assets\/\d+)\/[0-9a-f-]+$/i;

export const markedVideoEmbed = {
  renderer: {
    paragraph({ tokens }: Tokens.Paragraph) {
      const only = tokens.length === 1 ? tokens[0] : null;
      if (only?.type !== "link" || only.text !== only.href || !videoAttachmentUrl.test(only.href)) {
        return false;
      }
      const src = only.href.replace(/"/g, "&quot;");
      return `<video src="${src}" controls muted playsinline preload="metadata"></video>\n`;
    },
  },
};

export type BigIntSerialized = number | string;

export function serializeBigInt(val: bigint): BigIntSerialized;
export function serializeBigInt<T>(val: T): T;
export function serializeBigInt(val: unknown): unknown {
  if (typeof val === "bigint") {
    const num = Number(val);
    return Number.isSafeInteger(num) ? num : val.toString();
  }
  return val;
}

export function serializeArray<T>(
  arr: T[]
): (T extends bigint ? BigIntSerialized : T)[];
export function serializeArray(arr: unknown[]): unknown[] {
  return arr.map((item) => serializeBigInt(item));
}

export function serializeRow(
  row: Record<string, unknown>
): Record<string, unknown> {
  const serialized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    serialized[key] = serializeBigInt(value);
  }
  return serialized;
}

export function assertJsonSerializable(value: unknown, requestName: string) {
  try {
    JSON.stringify(value);
  } catch (e) {
    throw new Error(
      `${requestName} value is not JSON-serializable: ${e?.message ?? e}`
    );
  }
}


// Known keys for each part of manifest.json. Keep these in sync with the
// `ManifestV0` / `ManifestV1` / `PluginView` / `PluginMenuItem` types and
// docs/plugin_development/manifest.md.
const MANIFEST_KEYS = [
  "manifestVersion", "id", "name", "author", "description", "version",
  "minAppVersion", "icon", "capabilities", "pluginEntryDir", "settings",
  "permissions",
];
const AUTHOR_KEYS = ["name", "url"];
const CAPABILITIES_KEYS = ["views", "menu"];
const VIEW_KEYS = ["id", "name", "type", "entry"];
const MENU_ITEM_KEYS = [
  "command", "name", "description", "view", "placement", "icon",
  "enabledWhen", "group", "order",
];

export type UnknownManifestProperty = {
  /** Where the property is, e.g. `capabilities.menu[0].placment` */
  path: string;
  /** The closest known property name, if one is close enough */
  suggestion?: string;
};

function levenshtein(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_v, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(
        prev[j] + 1,
        prev[j - 1] + 1,
        diag + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
      diag = tmp;
    }
  }
  return prev[b.length];
}

function closestKey(key: string, known: string[]): string | undefined {
  const lower = key.toLowerCase();
  let best: string | undefined;
  let bestDistance = Infinity;
  for (const candidate of known) {
    const distance = levenshtein(lower, candidate.toLowerCase());
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }
  // Only suggest when it's plausibly a typo, not a different word.
  const maxDistance = Math.max(1, Math.floor(key.length / 3));
  return bestDistance <= maxDistance ? best : undefined;
}

function collectUnknown(
  value: unknown,
  known: string[],
  path: string,
  out: UnknownManifestProperty[]
) {
  if (!_.isPlainObject(value)) return;
  for (const key of Object.keys(value as object)) {
    // `$schema` and similar editor hints are fine
    if (key.startsWith("$") || known.includes(key)) continue;
    out.push({
      path: path ? `${path}.${key}` : key,
      suggestion: closestKey(key, known),
    });
  }
}

/**
 * Lists properties in a plugin manifest that Beekeeper Studio doesn't know
 * about, usually typos such as `placment` or `entryPoint`. Unknown properties
 * are ignored when loading, so this is only used to warn plugin developers.
 */
export function findUnknownManifestProperties(manifest: Manifest): UnknownManifestProperty[] {
  const out: UnknownManifestProperty[] = [];
  collectUnknown(manifest, MANIFEST_KEYS, "", out);
  collectUnknown(manifest?.author, AUTHOR_KEYS, "author", out);

  const capabilities = manifest?.capabilities;
  collectUnknown(capabilities, CAPABILITIES_KEYS, "capabilities", out);

  if (_.isArray(capabilities?.views)) {
    capabilities.views.forEach((view, i) =>
      collectUnknown(view, VIEW_KEYS, `capabilities.views[${i}]`, out)
    );
  }
  if (_.isArray(capabilities?.menu)) {
    capabilities.menu.forEach((item, i) =>
      collectUnknown(item, MENU_ITEM_KEYS, `capabilities.menu[${i}]`, out)
    );
  }
  return out;
}

export function formatUnknownManifestProperty({ path, suggestion }: UnknownManifestProperty): string {
  const message = `Unknown property "${path}" in manifest.json.`;
  return suggestion ? `${message} Did you mean "${suggestion}"?` : message;
}
