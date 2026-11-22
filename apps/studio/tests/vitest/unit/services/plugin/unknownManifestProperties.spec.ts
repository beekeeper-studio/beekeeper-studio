import { describe, it, expect } from "vitest";
import {
  findUnknownManifestProperties,
  formatUnknownManifestProperty,
} from "@/services/plugin/utils";

const validManifest = {
  $schema: "https://example.com/manifest.schema.json",
  manifestVersion: 1,
  id: "my-plugin",
  name: "My Plugin",
  author: { name: "Someone", url: "https://example.com" },
  description: "Does things",
  version: "1.0.0",
  minAppVersion: "6.2.0",
  icon: "analytics",
  pluginEntryDir: "dist",
  capabilities: {
    views: [
      { id: "main", name: "Main", type: "shell-tab", entry: "index.html" },
    ],
    menu: [
      {
        command: "open",
        name: "Open",
        description: "Opens it",
        view: "main",
        placement: ["menubar.tools", "newTabDropdown"],
        icon: "add",
        enabledWhen: "explainResult",
        group: "g",
        order: 1,
      },
    ],
  },
} as any;

describe("findUnknownManifestProperties", () => {
  it("returns nothing for a manifest that only uses known properties", () => {
    expect(findUnknownManifestProperties(validManifest)).toEqual([]);
  });

  it("accepts a string author", () => {
    expect(findUnknownManifestProperties({ ...validManifest, author: "Someone" })).toEqual([]);
  });

  it("finds unknown properties at every level, with a suggestion for typos", () => {
    const manifest = {
      ...validManifest,
      verison: "1.0.0",
      author: { name: "Someone", url: "https://example.com", emial: "a@b.c" },
      capabilities: {
        ...validManifest.capabilities,
        menus: [],
        views: [{ id: "main", name: "Main", type: "shell-tab", entryPoint: "index.html" }],
        menu: [{ command: "open", name: "Open", view: "main", placment: "menubar.tools" }],
      },
    };

    expect(findUnknownManifestProperties(manifest)).toEqual([
      { path: "verison", suggestion: "version" },
      { path: "author.emial", suggestion: undefined },
      { path: "capabilities.menus", suggestion: "menu" },
      { path: "capabilities.views[0].entryPoint", suggestion: undefined },
      { path: "capabilities.menu[0].placment", suggestion: "placement" },
    ]);
  });

  it("matches suggestions case-insensitively", () => {
    expect(findUnknownManifestProperties({ ...validManifest, MinAppVersion: "6.0.0" }))
      .toEqual([{ path: "MinAppVersion", suggestion: "minAppVersion" }]);
  });

  it("does not suggest unrelated names", () => {
    expect(findUnknownManifestProperties({ ...validManifest, homepage: "https://example.com" }))
      .toEqual([{ path: "homepage", suggestion: undefined }]);
  });

  it("does not throw on a manifest missing capabilities", () => {
    const { capabilities: _c, ...rest } = validManifest;
    expect(findUnknownManifestProperties(rest)).toEqual([]);
  });
});

describe("formatUnknownManifestProperty", () => {
  it("includes the suggestion when there is one", () => {
    expect(formatUnknownManifestProperty({ path: "capabilities.menu[0].placment", suggestion: "placement" }))
      .toBe('Unknown property "capabilities.menu[0].placment" in manifest.json. Did you mean "placement"?');
  });

  it("omits the suggestion when there is none", () => {
    expect(formatUnknownManifestProperty({ path: "homepage" }))
      .toBe('Unknown property "homepage" in manifest.json.');
  });
});
