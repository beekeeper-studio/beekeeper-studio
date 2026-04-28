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

import { safeOpenExternal } from "@/background/lib/electron/safeOpenExternal";

describe("safeOpenExternal", () => {
  beforeEach(() => {
    mockOpenExternal.mockClear();
    mockWarn.mockClear();
  });

  describe("allowed protocols", () => {
    it.each([
      "https://docs.beekeeperstudio.io/",
      "http://localhost:3000/foo?bar=1",
      "https://example.com/path#hash",
    ])("opens %s", (url) => {
      expect(safeOpenExternal(url)).toBe(true);
      expect(mockOpenExternal).toHaveBeenCalledTimes(1);
      expect(mockOpenExternal).toHaveBeenCalledWith(expect.stringMatching(/^https?:\/\//));
      expect(mockWarn).not.toHaveBeenCalled();
    });
  });

  describe("blocked protocols (RCE vectors)", () => {
    it.each([
      ["file:///etc/passwd"],
      ["file:///C:/Windows/System32/calc.exe"],
      ["javascript:alert(1)"],
      ["vbscript:msgbox(1)"],
      ["ms-cxh-full:foo"],
      ["smb://attacker/share"],
      ["ftp://example.com/"],
      ["data:text/html,<script>alert(1)</script>"],
    ])("blocks %s", (url) => {
      expect(safeOpenExternal(url)).toBe(false);
      expect(mockOpenExternal).not.toHaveBeenCalled();
      expect(mockWarn).toHaveBeenCalled();
    });
  });

  describe("invalid input", () => {
    it.each([
      ["", "empty string"],
      ["not a url", "non-URL string"],
      ["://broken", "malformed"],
      ["http:/example.com", "missing slash"],
    ])("rejects %p (%s)", (url) => {
      expect(safeOpenExternal(url as string)).toBe(false);
      expect(mockOpenExternal).not.toHaveBeenCalled();
    });

    it.each([
      [null],
      [undefined],
      [42],
      [{ url: "https://example.com" }],
      [["https://example.com"]],
    ])("rejects non-string input %p", (input) => {
      expect(safeOpenExternal(input as unknown)).toBe(false);
      expect(mockOpenExternal).not.toHaveBeenCalled();
    });
  });

  it("does not let a file:// URL with an http-looking host through", () => {
    expect(safeOpenExternal("file://https.example.com/calc.exe")).toBe(false);
    expect(mockOpenExternal).not.toHaveBeenCalled();
  });
});
