import { describe, it, expect } from "vitest";
import { ThemeCompiler } from "@/services/theme/ThemeCompiler";

const themeCss = `
.light-theme {
  --background: #ffffff;
  --base-gray: #1f2328;
  --base-blue: #0969da;
  --base-accent: var(--base-blue);
}

.dark-theme {
  --background: #0d1117;
  --base-gray: #f0f6fc;
  --base-blue: #1f6feb;
  --base-accent: #1f6feb;
}

.light-theme,
.dark-theme {
  --link-fg: var(--blue-11);
}

.some-element {
  background: red;
}
`;

describe("ThemeCompiler", () => {
  describe("compile", () => {
    it("generates every step of the gray scale", () => {
      const compiler = new ThemeCompiler(themeCss);
      const css = compiler.compile();

      for (let step = 1; step <= 12; step++) {
        expect(css).toContain(`--gray-${step}:`);
        expect(css).toContain(`--gray-a${step}:`);
      }
    });

    it("generates scales only for the base colors the theme defines", () => {
      const compiler = new ThemeCompiler(themeCss);
      const css = compiler.compile();

      expect(css).toContain("--blue-1:");
      expect(css).toContain("--primary-1:");
      expect(css).not.toContain("--red-1:");
    });

    it("keeps the theme CSS", () => {
      const compiler = new ThemeCompiler(themeCss);
      const css = compiler.compile();

      expect(css).toContain("--link-fg: var(--blue-11);");
      expect(css).toContain(".some-element");
    });

    it("wraps the result in a @scope that excludes theme previews", () => {
      const compiler = new ThemeCompiler(themeCss);
      const css = compiler.compile();

      expect(
        css.startsWith("@scope (:root) to ([data-theme-preview]) {")
      ).toBe(true);
    });
  });

  describe("base gray from accent", () => {
    it("derives the gray from the accent hue when --base-gray is missing", () => {
      const withoutGray = new ThemeCompiler(`
.light-theme {
  --background: #ffffff;
  --base-accent: #fad83b;
}

.dark-theme {
  --background: #090909;
  --base-accent: #fad83b;
}
`);
      const withGray = new ThemeCompiler(`
.light-theme {
  --background: #ffffff;
  --base-gray: #24231d;
  --base-accent: #fad83b;
}

.dark-theme {
  --background: #090909;
  --base-gray: #f7f5ed;
  --base-accent: #fad83b;
}
`);

      const grayScale = /--gray-a?\d+: [^;]+/g;
      expect(withoutGray.compile().match(grayScale)).toEqual(
        withGray.compile().match(grayScale)
      );
    });
  });

  describe("optional colors", () => {
    it("compiles a theme that only sets the background", () => {
      const compiler = new ThemeCompiler(`
.light-theme {
  --background: WhiteSmoke;
}
`);
      const css = compiler.compile();

      expect(css).not.toContain("--gray-1:");
    });

    it("generates scales when the theme doesn't set the background", () => {
      const compiler = new ThemeCompiler(`
.dark-theme {
  --base-accent: #0969da;
}
`);
      const css = compiler.compile();

      expect(css).toContain("--primary-9:");
    });

    it("compiles a theme without a dark mode", () => {
      const compiler = new ThemeCompiler(`
.light-theme {
  --background: WhiteSmoke;
  --base-gray: DarkSlateGray;
}
`);
      const css = compiler.compile();

      // One hex and one wide-gamut value, both from the light mode.
      expect(css.match(/--gray-1:/g)).toHaveLength(2);
    });

    it("generates hue scales without a gray", () => {
      const compiler = new ThemeCompiler(`
.light-theme {
  --background: WhiteSmoke;
  --base-blue: #3498db;
}
`);
      const css = compiler.compile();

      expect(css).toContain("--blue-1:");
      expect(css).not.toContain("--gray-1:");
    });
  });

  describe("compilePreview", () => {
    it("wraps the result in a @scope for the theme id", () => {
      const compiler = new ThemeCompiler(themeCss);
      const css = compiler.compilePreview("github");

      expect(css.startsWith('@scope ([data-theme-preview="github"]) {')).toBe(
        true
      );
    });
  });
});

describe("theme CSS network isolation", () => {
  it.each([
    `.a { background: url("https://example.com/tracking-pixel.png"); }`,
    `.a { background: url(http://example.com/x.png); }`,
    `.a { background: url(//example.com/x.png); }`,
    `.a { background: url(\\\\\\\\example.com/x.png); }`,
    `.a { background: url(file:///etc/passwd); }`,
    `.a { background: url(theme://other-theme/secret.png); }`,
    `.a { background: url(\\68ttps://example.com/x.png); }`,
    `.a { background: \\75 rl(https://example.com/x.png); }`,
    `.a { background: url("ht\\
tps://example.com/x.png"); }`,
    `.a { background: image-set("https://example.com/x.png" 1x); }`,
    `.a { background: -webkit-image-set(url(https://example.com/x.png) 1x); }`,
    `.a { --x: url(https://example.com/x.png); }`,
    `@import "https://example.com/x.css";`,
    `@import url(//example.com/x.css);`,
    `@import url("data:text/css,.a{background:url(https://example.com/x.png)}");`,
    `@font-face { font-family: x; src: url(https://example.com/x.woff2); }`,
    `.a { background: url(https://example.com/x.png)`,
  ])("strips %s", (css) => {
    const out = new ThemeCompiler(css).compile();
    expect(out).not.toMatch(/example\.com/);
    expect(new ThemeCompiler(css).sanitize()).not.toMatch(/example\.com/);
  });

  it("strips image-set() fed through var(), which hides its URL", () => {
    const css = `.a { --x: "https://example.com/x.png"; background: image-set(var(--x) 1x); }`;
    expect(new ThemeCompiler(css).compile()).not.toContain("image-set");
  });

  it.each([
    `.a { background: url(fonts/x.png); }`,
    `.a { background: url("../x.png"); }`,
    `.a { background: url("data:image/png;base64,AAAA"); }`,
    `.a { mask: url(#mask); }`,
    `.a { content: "https://example.com"; }`,
    `.a { background: image-set("x.png" 1x, "y.png" 2x); }`,
  ])("keeps %s", (css) => {
    const declaration = css.slice(css.indexOf("{") + 1, css.indexOf(";"));
    expect(new ThemeCompiler(css).compile()).toContain(declaration.trim());
  });
});

describe("theme CSS at-rules", () => {
  it("keeps @font-face and local @import outside the scope", () => {
    const css = new ThemeCompiler(`
.a { color: red; }
@font-face { font-family: x; src: url(fonts/x.woff2); }
@import "./more.css";
`).compile();
    const scope = css.indexOf("@scope");
    expect(css.indexOf("@font-face")).toBeLessThan(scope);
    expect(css.indexOf("@import")).toBeLessThan(scope);
    expect(css.indexOf(".a")).toBeGreaterThan(scope);
    expect(css.indexOf("@import")).toBeLessThan(css.indexOf("@font-face"));
  });
});

describe("theme CSS syntax errors", () => {
  it("keeps the rest of the file when a closing brace is missing", () => {
    const css = new ThemeCompiler(`
.dark-theme { --background: #0b2a4a; --base-accent: #3da5ff; }
.broken { color: red;
.after { color: blue; }
`).compile();
    expect(css).toContain("--primary-1:");
    expect(css).toContain("color: blue");
  });

  it("keeps the rest of the file when a base color is unparseable", () => {
    const css = new ThemeCompiler(`
.light-theme { --background: #fff
.dark-theme { --background: #0b2a4a; }
.other { color: blue; }
`).compile();
    expect(css).toContain("color: blue");
  });
});
