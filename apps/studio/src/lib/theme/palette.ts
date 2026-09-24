import { generateRadixColors } from "@/vendor/radix-ui/generate-radix-color";

// prettier-ignore
type Scale = [string, string, string, string, string, string, string, string, string, string, string, string];

export type GeneratePaletteOptions = {
  /** Which base scales to build from — `false` if light, `true` if dark. */
  dark: boolean;
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
  /** Text color that reads on step 9. */
  foreground: string;
};

export function generatePalette(options: GeneratePaletteOptions): Palette {
  const colors = generateRadixColors({
    appearance: options.dark ? "dark" : "light",
    ...options,
  });
  return {
    scale: colors.accentScale,
    scaleAlpha: colors.accentScaleAlpha,
    foreground: colors.accentContrast,
  };
}

/** The palette as `--<name>-1..12`, `--<name>-a1..12` and `--<name>-solid-fg` custom properties. */
export function generatePaletteAsCssProps(
  name: string,
  options: GeneratePaletteOptions
): string {
  const palette = generatePalette(options);

  const lines: string[] = [];
  palette.scale.forEach((color, i) => {
    lines.push(`--${name}-${i + 1}: ${color};`);
  });
  palette.scaleAlpha.forEach((color, i) => {
    lines.push(`--${name}-a${i + 1}: ${color};`);
  });
  lines.push(`--${name}-fg: ${palette.foreground};`);
  return lines.join("\n");
}
