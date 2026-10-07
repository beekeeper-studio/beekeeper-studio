import { describe, it, expect } from "vitest";
import { ThemeCompiler } from "@commercial/backend/lib/theme/ThemeCompiler";

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
