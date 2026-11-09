import postcss, { AtRule, Root } from "postcss";
import { ColorGenerator } from "./ColorGenerator";

export class ThemeCompiler {
  constructor(readonly css: string) { }

  compile(): string {
    const processor = postcss([
      {
        postcssPlugin: "theme-colors",
        Once: (root) => {
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

          // Keeps the active theme out of theme previews, which load their
          // own theme in a nested @scope.
          const scope = new AtRule({
            name: "scope",
            params: "(:root) to ([data-theme-preview])",
          });
          const nodes = root.nodes.slice();
          root.removeAll();
          scope.append(nodes);
          root.append(scope);
        },
      },
    ]);
    const result = processor.process(this.css);
    return result.css;
  }

  compilePreview(themeId: string): string {
    const result = postcss([
      {
        postcssPlugin: "theme-preview-colors",
        Once: (root) => {
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

          const scope = new AtRule({
            name: "scope",
            params: `([data-theme-preview="${themeId}"])`,
          });
          const nodes = root.nodes.slice();
          root.removeAll();
          scope.append(nodes);
          root.append(scope);
        },
      },
    ]).process(this.css);
    return result.css;
  }

  private generateColors(
    root: Root,
    selector: string,
    appearance: "light" | "dark"
  ): string {
    const colors = this.readBaseColors(root, selector);

    if (!colors.background) {
      return "";
    }

    const palette = new ColorGenerator({
      appearance,
      background: colors.background,
      accent: colors.accent,
      gray: colors.gray,
    });

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
