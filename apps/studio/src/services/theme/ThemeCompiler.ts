import postcss, { AtRule, Root } from "postcss";
import safeParser from "postcss-safe-parser";
import rawLog from "@bksLogger";
import { ColorGenerator } from "./ColorGenerator";
import { stripExternalResources } from "./themeCssSanitizer";

const log = rawLog.scope("ThemeCompiler");

export class ThemeCompiler {
  constructor(readonly css: string) { }

  compile(): string {
    // Keeps the active theme out of theme previews, which load their own theme
    // in a nested @scope.
    return this.build("(:root) to ([data-theme-preview])");
  }

  compilePreview(themeId: string): string {
    return this.build(`([data-theme-preview="${themeId}"])`);
  }

  /** For stylesheets a theme imports, which aren't scoped or given colors. */
  sanitize(): string {
    return postcss([
      {
        postcssPlugin: "theme-sanitize",
        Once: (root) => stripExternalResources(root),
      },
    ]).process(this.css, { parser: safeParser, from: undefined }).css;
  }

  private build(scopeParams: string): string {
    return postcss([
      {
        postcssPlugin: "theme-build",
        Once: (root) => {
          stripExternalResources(root);

          const lightColors = this.generateColors(
            root,
            ".light-theme",
            "light"
          );
          const darkColors = this.generateColors(root, ".dark-theme", "dark");
          root.prepend(
            `.light-theme { ${lightColors} }`,
            `.dark-theme { ${darkColors} }`
          );

          const scope = new AtRule({ name: "scope", params: scopeParams });
          const nodes = root.nodes.slice();
          // Browsers drop these inside @scope, so they stay at the top level.
          const atRulesNamed = (name: string) =>
            nodes.filter(
              (node) => node.type === "atrule" && node.name.toLowerCase() === name
            );
          // Browsers ignore an @import that follows any other rule.
          const unscoped = [...atRulesNamed("import"), ...atRulesNamed("font-face")];
          root.removeAll();
          scope.append(nodes.filter((node) => !unscoped.includes(node)));
          root.append(...unscoped, scope);
        },
      },
    ]).process(this.css, { parser: safeParser, from: undefined }).css;
  }

  private generateColors(
    root: Root,
    selector: string,
    appearance: "light" | "dark"
  ): string {
    const colors = this.readBaseColors(root, selector);

    // Must match the --background defaults in tokens/semantics.scss.
    let background = colors.background;
    if (!background) {
      background = appearance === "light" ? "#ffffff" : "#121212";
    }

    let palette: ColorGenerator;
    try {
      palette = new ColorGenerator({
        appearance,
        background,
        accent: colors.accent,
        gray: colors.gray,
      });
    } catch (e) {
      log.warn(`Skipping ${appearance} palette, invalid base colors`, e);
      return "";
    }

    let css = "";
    if (colors.accent) {
      css += palette.generateCss("primary", colors.accent);
    }
    if (palette.gray) {
      css += palette.generateGrayCss();
    }
    if (colors.red) {
      css += palette.generateCss("red", colors.red);
    }
    if (colors.orange) {
      css += palette.generateCss("orange", colors.orange);
    }
    if (colors.yellow) {
      css += palette.generateCss("yellow", colors.yellow);
    }
    if (colors.green) {
      css += palette.generateCss("green", colors.green);
    }
    if (colors.blue) {
      css += palette.generateCss("blue", colors.blue);
    }
    if (colors.purple) {
      css += palette.generateCss("purple", colors.purple);
    }
    if (colors.pink) {
      css += palette.generateCss("pink", colors.pink);
    }

    return css;
  }

  private readBaseColors(root: Root, selector: string) {
    const declarations = new Map<string, string>();

    for (const node of root.nodes) {
      if (node.type !== "rule" || !node.selectors.includes(selector)) {
        continue;
      }

      for (const child of node.nodes) {
        if (child.type === "decl" && child.prop.startsWith("--")) {
          declarations.set(child.prop, child.value);
        }
      }
    }

    return {
      accent: this.readColor(declarations, "--base-accent"),
      background: this.readColor(declarations, "--background"),
      gray: this.readColor(declarations, "--base-gray"),
      red: this.readColor(declarations, "--base-red"),
      orange: this.readColor(declarations, "--base-orange"),
      yellow: this.readColor(declarations, "--base-yellow"),
      green: this.readColor(declarations, "--base-green"),
      blue: this.readColor(declarations, "--base-blue"),
      purple: this.readColor(declarations, "--base-purple"),
      pink: this.readColor(declarations, "--base-pink"),
    };
  }

  private readColor(
    declarations: Map<string, string>,
    property: string
  ): string | undefined {
    const value = declarations.get(property);
    const reference = value?.match(/^var\((--[\w-]+)\)$/);

    if (reference) {
      return declarations.get(reference[1]);
    }
    return value;
  }
}
