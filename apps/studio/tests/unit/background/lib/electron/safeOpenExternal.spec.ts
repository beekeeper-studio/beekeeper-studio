const mockOpenExternal = jest.fn();
const mockWarn = jest.fn();

jest.mock("electron", () => ({
  shell: { openExternal: mockOpenExternal },
}));

jest.mock("@bksLogger", () => ({
  __esModule: true,
  default: {
    scope: () => ({
      warn: mockWarn,
      info: jest.fn(),
      debug: jest.fn(),
      error: jest.fn(),
    }),
  },
}));

import {
  isSafeExternalUrl,
  safeOpenExternal,
} from "@/background/lib/electron/safeOpenExternal";

describe("isSafeExternalUrl", () => {
  describe("returns true for http(s) URLs", () => {
    it.each([
      "http://example.com",
      "http://example.com/",
      "http://localhost",
      "http://localhost:3000",
      "http://localhost:3000/foo?bar=1#baz",
      "http://127.0.0.1:8080/",
      "http://[::1]/",
      "http://user:pass@example.com/",
      "http://example.com/path%20with%20spaces",
      "http://xn--bcher-kva.example/", // punycode
      "https://example.com",
      "https://example.com/",
      "https://docs.beekeeperstudio.io/",
      "https://example.com/path?query=value&other=1",
      "https://example.com/path#fragment",
      "https://sub.domain.example.com:8443/deep/path/",
      "HTTPS://EXAMPLE.COM/", // scheme is case-insensitive
      "Http://Example.Com/",
    ])("%s", (url) => {
      expect(isSafeExternalUrl(url)).toBe(true);
    });
  });

  describe("returns false for known RCE / dangerous schemes", () => {
    it.each([
      // file: — the originally reported plugin RCE vector
      "file:///etc/passwd",
      "file:///C:/Windows/System32/calc.exe",
      "file:///C:/Users/victim/AppData/Local/Temp/payload.exe",
      "file://server/share/payload.exe",
      "FILE:///etc/passwd",
      // file:// followed by an http-looking host should still be file:
      "file://https.example.com/calc.exe",
      "file://http/foo",
      // script-execution schemes
      "javascript:alert(1)",
      "javascript:void(0)",
      "JavaScript:alert(1)",
      "vbscript:msgbox(1)",
      // data: can render arbitrary HTML/JS in browsers
      "data:text/html,<script>alert(1)</script>",
      "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==",
      // local IPC / network protocols that can pivot
      "smb://attacker/share/payload",
      "ftp://example.com/",
      "ftps://example.com/",
      "ssh://example.com/",
      "telnet://example.com/",
      "gopher://example.com/",
      // Windows-only handler abuse
      "ms-cxh-full:foo",
      "ms-msdt:/id PCWDiagnostic",
      "search-ms:query=foo",
      "ms-officecmd:foo",
      // mail/chat handlers — out of scope for an "external link"
      "mailto:user@example.com",
      "tel:+15551234",
      "sms:+15551234",
      // custom app protocols
      "steam://run/",
      "slack://channel",
      "vscode://foo",
      // chrome: / about: / view-source:
      "chrome://settings/",
      "about:blank",
      "view-source:https://example.com",
      // app-internal protocols registered by Beekeeper itself
      "app://index.html",
      "plugin://some-plugin/index.html",
      // intent: (Android), edge: (Windows)
      "intent://example.com/#Intent;scheme=https;end",
    ])("%s", (url) => {
      expect(isSafeExternalUrl(url)).toBe(false);
    });
  });

  describe("returns false for malformed strings", () => {
    it.each([
      "",
      " ",
      "not a url",
      "://broken",
      "http//missing-colon.com",
      "://example.com",
      "example.com", // no scheme
      "/relative/path",
      "//protocol-relative.com",
      "javascript",
      "file",
      "http: //space-after-colon.com",
      "\t\n",
    ])("%j", (url) => {
      expect(isSafeExternalUrl(url)).toBe(false);
    });
  });

  describe("returns false for non-string input", () => {
    it.each([
      [null],
      [undefined],
      [0],
      [42],
      [true],
      [false],
      [NaN],
      [{}],
      [{ url: "https://example.com" }],
      [["https://example.com"]],
      [Symbol("https://example.com")],
      [() => "https://example.com"],
      [Buffer.from("https://example.com")],
    ])("%p", (input) => {
      expect(isSafeExternalUrl(input as unknown)).toBe(false);
    });
  });

  it("acts as a TypeScript type predicate narrowing to string", () => {
    const maybe: unknown = "https://example.com";
    if (isSafeExternalUrl(maybe)) {
      // After narrowing, this must compile as a string operation.
      const upper: string = maybe.toUpperCase();
      expect(upper).toBe("HTTPS://EXAMPLE.COM");
    } else {
      throw new Error("predicate should have narrowed to string");
    }
  });
});

describe("safeOpenExternal", () => {
  beforeEach(() => {
    mockOpenExternal.mockClear();
    mockWarn.mockClear();
  });

  it("calls shell.openExternal and returns true for a safe URL", () => {
    expect(safeOpenExternal("https://docs.beekeeperstudio.io/")).toBe(true);
    expect(mockOpenExternal).toHaveBeenCalledTimes(1);
    expect(mockOpenExternal).toHaveBeenCalledWith("https://docs.beekeeperstudio.io/");
    expect(mockWarn).not.toHaveBeenCalled();
  });

  it("does not call shell.openExternal for a file:// URL", () => {
    expect(safeOpenExternal("file:///etc/passwd")).toBe(false);
    expect(mockOpenExternal).not.toHaveBeenCalled();
    expect(mockWarn).toHaveBeenCalled();
  });

  it("does not call shell.openExternal for non-string input", () => {
    expect(safeOpenExternal(null)).toBe(false);
    expect(safeOpenExternal(undefined)).toBe(false);
    expect(safeOpenExternal(42 as unknown)).toBe(false);
    expect(safeOpenExternal({ url: "https://example.com" } as unknown)).toBe(false);
    expect(mockOpenExternal).not.toHaveBeenCalled();
  });

  it("logs a warning when refusing a URL", () => {
    safeOpenExternal("javascript:alert(1)");
    expect(mockWarn).toHaveBeenCalledTimes(1);
    expect(mockWarn.mock.calls[0].join(" ")).toMatch(/Refusing to open/i);
  });
});
