import { generateRadixColors } from "@/vendor/radix-ui/generate-radix-color";

// prettier-ignore
type Scale = [string, string, string, string, string, string, string, string, string, string, string, string];

export type GeneratePaletteOptions = {
  /** Which base scales to build from — light or dark. */
  appearance: "light" | "dark";
  /** Seed color for the accent scale; lands on step 9. */
  accent: string;
  /** Seed color for the gray scale the accent is tinted against. */
  gray: string;
  /**
   * Page background the scale is transposed onto, and the color the alpha
   * scale is blended against.
   */
  background: string;
};

export type Palette = {
  /** The 12 steps as hex, from step 1 (nearest the background) to step 12 (highest contrast). */
  scale: Scale;
  /** The same 12 steps as translucent hex, blended against the background. */
  scaleAlpha: Scale;
  /** The gray ramp the accent was tinted against. Depends only on gray and background. */
  grayScale: Scale;
  /** The same 12 gray steps as translucent hex, blended against the background. */
  grayScaleAlpha: Scale;
};

export function generatePalette(options: GeneratePaletteOptions): Palette {
  const colors = generateRadixColors(options);
  return {
    scale: colors.accentScale,
    scaleAlpha: colors.accentScaleAlpha,
    grayScale: colors.grayScale,
    grayScaleAlpha: colors.grayScaleAlpha,
  };
}
