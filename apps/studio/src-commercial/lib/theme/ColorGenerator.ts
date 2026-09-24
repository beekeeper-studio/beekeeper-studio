import { generateRadixColors } from "@/vendor/radix-ui/generate-radix-color";

export type GeneratePaletteOptions = {
  accent: string;
  gray: string;
  background: string;
};

export class ColorGenerator {
  constructor(readonly options: Omit<GeneratePaletteOptions, "accent">) { }

  generateCss(name: string, accent: string, dark: boolean): string {
    const colors = generateRadixColors({
      appearance: dark ? "dark" : "light",
      gray: this.options.gray,
      background: this.options.background,
      accent,
    });

    let css = "";
    css += this.stringify(name, colors.accentScale, colors.accentScaleAlpha);
    css += `--${name}-contrast: ${colors.accentContrast}; `;
    css += `--${name}-surface: ${colors.accentSurface}; `;
    css += `@supports (color: color(display-p3 1 1 1)) {
      @media (color-gamut: p3) {
        ${this.stringify(
          name,
          colors.accentScaleWideGamut,
          colors.accentScaleAlphaWideGamut
        )}
        --${name}-surface: ${colors.accentSurfaceWideGamut};
      }
    }`;
    return css;
  }

  generateGrayCss(gray: string, dark: boolean): string {
    const colors = generateRadixColors({
      appearance: dark ? "dark" : "light",
      gray,
      background: this.options.background,
      accent: gray,
    });

    let css = "";
    css += this.stringify("gray", colors.grayScale, colors.grayScaleAlpha);
    css += `--gray-contrast: ${colors.accentContrast}; `;
    css += `@supports (color: color(display-p3 1 1 1)) {
      @media (color-gamut: p3) {
        ${this.stringify(
          "gray",
          colors.grayScaleWideGamut,
          colors.grayScaleAlphaWideGamut
        )}
      }
    }`;
    return css;
  }

  private stringify(
    name: string,
    scale: readonly string[],
    alphaScale: readonly string[]
  ): string {
    let css = "";
    scale.forEach((color, i) => {
      css += `--${name}-${i + 1}: ${color}; `;
    });
    alphaScale.forEach((color, i) => {
      css += `--${name}-a${i + 1}: ${color}; `;
    });
    return css;
  }
}
