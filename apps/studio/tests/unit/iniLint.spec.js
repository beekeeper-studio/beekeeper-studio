import {
  lintIniSyntax,
  buildIniLineIndex,
  locateWarnings,
  lintUserConfig,
} from "@/common/bksConfig/iniLint";

describe("iniLint", () => {
  describe("lintIniSyntax", () => {
    it("should accept a well formed config", () => {
      const problems = lintIniSyntax(`
; a comment
# another comment

[ui.general]
save = ctrlOrCmd+s

[security]
activityEvents[] = one
activityEvents[] = two
`);
      expect(problems).toEqual([]);
    });

    it("should flag a line that is neither a section, comment, nor assignment", () => {
      const problems = lintIniSyntax("[general]\ngarbage\n");
      expect(problems).toHaveLength(1);
      expect(problems[0].line).toBe(1);
      expect(problems[0].severity).toBe("error");
      expect(problems[0].message).toMatch(/Expected `key = value`/);
    });

    it("should flag an unclosed section header", () => {
      const problems = lintIniSyntax("[general\nmaxResults = 10\n");
      expect(problems).toHaveLength(1);
      expect(problems[0].line).toBe(0);
      expect(problems[0].message).toMatch(/Unclosed section header/);
    });

    it("should flag an empty section name", () => {
      const problems = lintIniSyntax("[]\n");
      expect(problems).toHaveLength(1);
      expect(problems[0].message).toMatch(/Empty section name/);
    });

    it("should flag a missing key name", () => {
      const problems = lintIniSyntax("[general]\n = 10\n");
      expect(problems).toHaveLength(1);
      expect(problems[0].message).toMatch(/Missing key name/);
    });

    it("should flag duplicate scalar keys within a section", () => {
      const problems = lintIniSyntax(
        "[general]\nmaxResults = 10\nmaxResults = 20\n"
      );
      expect(problems).toHaveLength(1);
      expect(problems[0].line).toBe(2);
      expect(problems[0].severity).toBe("warning");
      expect(problems[0].message).toMatch(/Duplicate key `maxResults` in \[general\]/);
    });

    it("should not flag the same key used in different sections", () => {
      const problems = lintIniSyntax(
        "[general]\nmaxResults = 10\n[ui.general]\nmaxResults = 20\n"
      );
      expect(problems).toEqual([]);
    });

    it("should not flag repeated array keys, which is how arrays are built", () => {
      const problems = lintIniSyntax(
        "[security]\nactivityEvents[] = one\nactivityEvents[] = two\n"
      );
      expect(problems).toEqual([]);
    });

    it("should ignore blank lines and comments", () => {
      expect(lintIniSyntax("\n\n  \n; hi\n  # indented comment\n")).toEqual([]);
    });

    it("should tolerate windows line endings", () => {
      expect(lintIniSyntax("[general]\r\nmaxResults = 10\r\n")).toEqual([]);
    });
  });

  describe("buildIniLineIndex", () => {
    it("should index keys by their dotted path", () => {
      const index = buildIniLineIndex(
        ["[general]", "maxResults = 10", "", "[ui.general]", "save = ctrlOrCmd+s"].join("\n")
      );
      expect(index.get("general")).toBe(0);
      expect(index.get("general.maxResults")).toBe(1);
      expect(index.get("ui.general")).toBe(3);
      expect(index.get("ui.general.save")).toBe(4);
    });

    it("should strip the array suffix and keep the first occurrence", () => {
      const index = buildIniLineIndex(
        ["[security]", "activityEvents[] = one", "activityEvents[] = two"].join("\n")
      );
      expect(index.get("security.activityEvents")).toBe(1);
    });

    it("should index keys declared before any section at the top level", () => {
      const index = buildIniLineIndex("orphan = 1\n[general]\nmaxResults = 10");
      expect(index.get("orphan")).toBe(0);
      expect(index.get("general.maxResults")).toBe(2);
    });

    it("should skip comments and blank lines", () => {
      const index = buildIniLineIndex(
        ["; comment", "", "[general]", "# maxResults = 10", "maxResults = 20"].join("\n")
      );
      expect(index.get("general.maxResults")).toBe(4);
    });
  });

  describe("locateWarnings", () => {
    const text = ["[general]", "maxResults = 10", "notAKey = 5"].join("\n");

    it("should place a warning on the line declaring the key", () => {
      const located = locateWarnings(
        [
          {
            type: "unrecognized-key",
            sourceName: "user",
            section: "general",
            path: "general.notAKey",
          },
        ],
        text
      );
      expect(located).toHaveLength(1);
      expect(located[0].line).toBe(2);
      expect(located[0].message).toMatch(/Unrecognized key/);
    });

    it("should fall back to the section line when the key is not in the text", () => {
      const located = locateWarnings(
        [
          {
            type: "system-user-conflict",
            sourceName: "user",
            section: "general",
            path: "general.missing",
          },
        ],
        text
      );
      expect(located[0].line).toBe(0);
      expect(located[0].message).toMatch(/set by the system config/);
    });

    it("should describe an unrecognized section rather than a key", () => {
      const located = locateWarnings(
        [
          {
            type: "unrecognized-key",
            sourceName: "user",
            section: "nope",
            path: "nope",
          },
        ],
        "[nope]\nfoo = 1"
      );
      expect(located[0].line).toBe(0);
      expect(located[0].message).toMatch(/Unrecognized section \[nope\]/);
    });
  });

  describe("lintUserConfig", () => {
    it("should merge syntax problems and warnings in line order", () => {
      const text = ["[general]", "garbage", "notAKey = 5"].join("\n");
      const problems = lintUserConfig(text, [
        {
          type: "unrecognized-key",
          sourceName: "user",
          section: "general",
          path: "general.notAKey",
        },
      ]);
      expect(problems.map((p) => p.line)).toEqual([1, 2]);
      expect(problems[0].severity).toBe("error");
      expect(problems[1].severity).toBe("warning");
    });
  });
});
