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

