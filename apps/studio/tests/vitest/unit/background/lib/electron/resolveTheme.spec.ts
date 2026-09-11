import { resolveTheme } from "@/background/lib/electron/resolveTheme";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

function bodyOf(data: Buffer | null): string {
  return data?.toString("utf-8") || "";
}

const themeCss = ":root { --bks-accent: rebeccapurple; }";
const secret = `BKS-SECRET-${Date.now()}`;

let dir: string;
let secretPath: string;

describe("resolveTheme", () => {
  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "bks-themes-"));
    secretPath = `${dir}-secret.css`;
    fs.writeFileSync(path.join(dir, "custom.css"), themeCss);
    fs.writeFileSync(path.join(dir, "notes.md"), secret);
    fs.writeFileSync(secretPath, secret);
  });

  afterAll(() => {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.rmSync(secretPath, { force: true });
  });

  it("reads a stylesheet", async () => {
    const data = await resolveTheme(dir, new URL("app://themes/custom.css"));
    expect(bodyOf(data)).toBe(themeCss);
  });

  it("returns null for a theme that does not exist", async () => {
    const data = await resolveTheme(dir, new URL("app://themes/missing.css"));
    expect(data).toBeNull();
  });

  it("refuses files that are not stylesheets", async () => {
    const urls = [
      "app://themes/notes.md",
      "app://themes/custom.css.bak",
      "app://themes/custom",
      "app://themes/",
    ];
    for (const url of urls) {
      const data = await resolveTheme(dir, new URL(url));
      expect(data, url).toBeNull();
    }
  });

  it("does not disclose files outside the specified directory", async () => {
    const secretName = path.basename(secretPath);
    const urls = [
      `app://themes/../${secretName}`,
      `app://themes/%2e%2e/${secretName}`,
      `app://themes/%2E%2E%2F${secretName}`,
      `app://themes/..%5C${secretName}`,
      `app://themes/..%2F..%2F${secretName}`,
      `app://themes/${encodeURIComponent(secretPath)}`,
      `app://themes//${secretPath}`,
    ];
    for (const url of urls) {
      const data = await resolveTheme(dir, new URL(url));
      expect(bodyOf(data).includes(secret), url).toBe(false);
    }
  });
});
