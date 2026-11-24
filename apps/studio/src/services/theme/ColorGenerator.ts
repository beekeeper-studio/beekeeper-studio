import Color from "colorjs.io";
import { generateRadixColors } from "@/vendor/radix-ui/generate-radix-color";

export type GeneratePaletteOptions = {
  appearance: "dark" | "light";
  background: string;
  accent?: string;
  gray?: string;
};

export class ColorGenerator {
  readonly gray: string | undefined;

  constructor(readonly options: GeneratePaletteOptions) {
    if (options.gray) {
      this.gray = options.gray;
    } else if (options.accent) {
      this.gray = this.grayFromAccent(options.accent);
    }
  }

  generateCss(name: string, accent: string): string {
    const colors = generateRadixColors({
      appearance: this.options.appearance,
      // Hue scales only read the gray when the hue is pure black or white.
      gray: this.gray ?? this.options.background,
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

  generateGrayCss(): string {
    const colors = generateRadixColors({
      appearance: this.options.appearance,
      gray: this.gray,
      background: this.options.background,
      accent: this.gray,
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

  private grayFromAccent(accent: string): string {
    const hue = new Color(accent).to("oklch").coords[2];
    const lightness = this.options.appearance === "light" ? 0.2542 : 0.9703;
    const chroma = 0.0111;
    const gray = new Color("oklch", [lightness, chroma, hue]);
    return gray.to("srgb").toString({ format: "hex" });
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
