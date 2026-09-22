// Forked from https://github.com/radix-ui/website/blob/bb424082fd33fadc244a6dd276d3ced55caa6234/components/generate-radix-colors.tsx#L44
// Copyright (c) 2024 WorkOS. Distributed under an MIT license, see ./LICENSE

import * as RadixColors from "@radix-ui/colors";
import Color from "colorjs.io";
import BezierEasing from "bezier-easing";

type ArrayOf12<T> = [T, T, T, T, T, T, T, T, T, T, T, T];
const arrayOf12 = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;

// prettier-ignore
const grayScaleNames = ['gray', 'mauve', 'slate', 'sage', 'olive', 'sand'] as const;

// prettier-ignore
const scaleNames = [...grayScaleNames, 'tomato', 'red', 'ruby', 'crimson', 'pink',
'plum', 'purple', 'violet', 'iris', 'indigo', 'blue', 'cyan', 'teal', 'jade', 'green',
'grass', 'brown', 'orange', 'sky', 'mint', 'lime', 'yellow', 'amber'] as const;

const lightColors = Object.fromEntries(
	scaleNames.map((scaleName) => [
		scaleName,
		Object.values(RadixColors[`${scaleName}P3`]).map((str) => new Color(str).to("oklch")),
	]),
) as Record<(typeof scaleNames)[number], ArrayOf12<Color>>;

const darkColors = Object.fromEntries(
	scaleNames.map((scaleName) => [
		scaleName,
		Object.values(RadixColors[`${scaleName}DarkP3`]).map((str) => new Color(str).to("oklch")),
	]),
) as Record<(typeof scaleNames)[number], ArrayOf12<Color>>;

const lightGrayColors = Object.fromEntries(
	grayScaleNames.map((scaleName) => [
		scaleName,
		Object.values(RadixColors[`${scaleName}P3`]).map((str) => new Color(str).to("oklch")),
	]),
) as Record<(typeof grayScaleNames)[number], ArrayOf12<Color>>;

const darkGrayColors = Object.fromEntries(
	grayScaleNames.map((scaleName) => [
		scaleName,
		Object.values(RadixColors[`${scaleName}DarkP3`]).map((str) => new Color(str).to("oklch")),
	]),
) as Record<(typeof grayScaleNames)[number], ArrayOf12<Color>>;

export const generateRadixColors = ({
	appearance,
	...args
}: {
	appearance: "light" | "dark";
	accent: string;
	gray: string;
	background: string;
}) => {
	const allScales = appearance === "light" ? lightColors : darkColors;
	const grayScales = appearance === "light" ? lightGrayColors : darkGrayColors;
	const backgroundColor = new Color(args.background).to("oklch");

	const grayBaseColor = new Color(args.gray).to("oklch");
	const grayScaleColors = getScaleFromColor(grayBaseColor, grayScales, backgroundColor);

	const accentBaseColor = new Color(args.accent).to("oklch");

	let accentScaleColors = getScaleFromColor(accentBaseColor, allScales, backgroundColor);

	// Enforce srgb for the background color
	const backgroundHex = backgroundColor.to("srgb").toString({ format: "hex" });

	// Make sure we use the tint from the gray scale for when base is pure white or black
	const accentBaseHex = accentBaseColor.to("srgb").toString({ format: "hex" });
	if (accentBaseHex === "#000" || accentBaseHex === "#fff") {
		accentScaleColors = grayScaleColors.map((color) => color.clone()) as ArrayOf12<Color>;
	}

	const [accent9Color, accentContrastColor] = getStep9Colors(accentScaleColors, accentBaseColor);

	accentScaleColors[8] = accent9Color;
	accentScaleColors[9] = getButtonHoverColor(accent9Color, [accentScaleColors]);

	// Limit saturation of the text colors
	accentScaleColors[10].coords[1] = Math.min(
		Math.max(accentScaleColors[8].coords[1], accentScaleColors[7].coords[1]),
		accentScaleColors[10].coords[1],
	);
	accentScaleColors[11].coords[1] = Math.min(
		Math.max(accentScaleColors[8].coords[1], accentScaleColors[7].coords[1]),
		accentScaleColors[11].coords[1],
	);

	const accentScaleHex = accentScaleColors.map((color) =>
		color.to("srgb").toString({ format: "hex" }),
	) as ArrayOf12<string>;

	const accentScaleWideGamut = accentScaleColors.map(toOklchString) as ArrayOf12<string>;

	const accentScaleAlphaHex = accentScaleHex.map((color) =>
		getAlphaColorSrgb(color, backgroundHex),
	) as ArrayOf12<string>;

	const accentScaleAlphaWideGamutString = accentScaleHex.map((color) =>
		getAlphaColorP3(color, backgroundHex),
	) as ArrayOf12<string>;

	const accentContrastColorHex = accentContrastColor.to("srgb").toString({ format: "hex" });

	const grayScaleHex = grayScaleColors.map((color) =>
		color.to("srgb").toString({ format: "hex" }),
	) as ArrayOf12<string>;

	const grayScaleWideGamut = grayScaleColors.map(toOklchString) as ArrayOf12<string>;

	const grayScaleAlphaHex = grayScaleHex.map((color) =>
		getAlphaColorSrgb(color, backgroundHex),
	) as ArrayOf12<string>;

	const grayScaleAlphaWideGamutString = grayScaleHex.map((color) =>
		getAlphaColorP3(color, backgroundHex),
	) as ArrayOf12<string>;

	const accentSurfaceHex =
		appearance === "light"
			? getAlphaColorSrgb(accentScaleHex[1], backgroundHex, 0.8)
			: getAlphaColorSrgb(accentScaleHex[1], backgroundHex, 0.5);

	const accentSurfaceWideGamutString =
		appearance === "light"
			? getAlphaColorP3(accentScaleWideGamut[1], backgroundHex, 0.8)
			: getAlphaColorP3(accentScaleWideGamut[1], backgroundHex, 0.5);

	return {
		accentScale: accentScaleHex,
		accentScaleAlpha: accentScaleAlphaHex,
		accentScaleWideGamut: accentScaleWideGamut,
		accentScaleAlphaWideGamut: accentScaleAlphaWideGamutString,
		accentContrast: accentContrastColorHex,

		grayScale: grayScaleHex,
		grayScaleAlpha: grayScaleAlphaHex,
		grayScaleWideGamut: grayScaleWideGamut,
		grayScaleAlphaWideGamut: grayScaleAlphaWideGamutString,

		graySurface: appearance === "light" ? "#ffffffcc" : "rgba(0, 0, 0, 0.05)",
		graySurfaceWideGamut:
			appearance === "light" ? "color(display-p3 1 1 1 / 80%)" : "color(display-p3 0 0 0 / 5%)",

		accentSurface: accentSurfaceHex,
		accentSurfaceWideGamut: accentSurfaceWideGamutString,

		background: backgroundHex,
	};
};

function getStep9Colors(scale: ArrayOf12<Color>, accentBaseColor: Color): [Color, Color] {
	const referenceBackgroundColor = scale[0];
	const distance = accentBaseColor.deltaEOK(referenceBackgroundColor) * 100;

	// If the accent base color is close to the page background color, it's likely
	// white on white or black on black, so we want to return something that makes sense instead
	if (distance < 25) {
		return [scale[8], getTextColor(scale[8])];
	}

	return [accentBaseColor, getTextColor(accentBaseColor)];
}

function getButtonHoverColor(source: Color, scales: ArrayOf12<Color>[]) {
	const [L, C, H] = source.coords;
	const newL = L > 0.4 ? L - 0.03 / (L + 0.1) : L + 0.03 / (L + 0.1);
	const newC = L > 0.4 && !isNaN(H) ? C * 0.93 + 0 : C;
	const buttonHoverColor = new Color("oklch", [newL, newC, H]);

	// Find closest in-scale color to donate the chroma and hue.
	// Especially useful when the source color is pure white or black,
	// but the gray scale is tinted.
	let closestColor = buttonHoverColor;
	let minDistance = Infinity;

	scales.forEach((scale) => {
		for (const color of scale) {
			const distance = buttonHoverColor.deltaEOK(color);
			if (distance < minDistance) {
				minDistance = distance;
				closestColor = color;
			}
		}
	});

	buttonHoverColor.coords[1] = closestColor.coords[1];
	buttonHoverColor.coords[2] = closestColor.coords[2];
	return buttonHoverColor;
}

function getScaleFromColor(
	source: Color,
	scales: Record<string, ArrayOf12<Color>>,
	backgroundColor: Color,
) {
	let allColors: { scale: string; color: Color; distance: number }[] = [];

	Object.entries(scales).forEach(([name, scale]) => {
		for (const color of scale) {
			const distance = source.deltaEOK(color);
			allColors.push({ scale: name, distance, color });
		}
	});

	allColors.sort((a, b) => a.distance - b.distance);

	// Remove non-unique scales
	let closestColors = allColors.filter(
		(color, i, arr) => i === arr.findIndex((value) => value.scale === color.scale),
	);

	// If the next two closest colors are both grays, remove the second one until it’s not a gray anymore.
	// This is because up next we will be comparing how close the two closest colors are to the source color,
	// and since the grays are all extremely close to each other, we won’t get any useful data from the second
	// closest color if it’s also a gray.
	const grayScaleNamesStr = grayScaleNames as readonly string[];
	const allAreGrays = closestColors.every((color) => grayScaleNamesStr.includes(color.scale));
	if (!allAreGrays && grayScaleNamesStr.includes(closestColors[0].scale)) {
		while (grayScaleNamesStr.includes(closestColors[1].scale)) {
			closestColors.splice(1, 1);
		}
	}

	let colorA = closestColors[0];
	let colorB = closestColors[1];

	// Light trigonometry ahead.
	//
	// We want to determine the color that is the closest to the source color. Sometimes it makes sense
	// to proportionally mix the two closest colors together, but sometimes it is not useful at all.
	// Color coords are spatial in 3D, however we can treat the data we have as a 2D projection that is good enough.
	//
	// Case 1:
	// If the distances between the source color, the 1st closest color (A) and the 2nd closest color (B) form
	// a triangle where NEITHER angle A nor B are larger than 90 degrees, then we want to mix the 1st and the 2nd
	// closest colors in the same proportion as distances AD and BD are to each other. Mixing the two would result
	// in a color that would be closer to the source color than either of the two original closest colors.
	// Example: source color is a desaturated blue, which is between "indigo" and "slate" scales.
	//
	//        C ← Source color
	//       /|⟍
	//      / |  ⟍
	//   b /  |    ⟍  a
	//    /   |      ⟍
	//   /    |        ⟍
	//  A --- D -------- B
	//        ↑
	//        The color we want to use as the base, which is a mix of A and B.
	//
	// Case 2:
	// If the distances between the source color, the 1st closest color (A) and the 2nd closest color (B) form
	// a triangle where EITHER angle A or B are larger than 90 degrees, then we don’t care about point B because it’s
	// directionally the same as A, as mixing A and B can’t provide us with a color that is any closer to the source.
	// Example: source color is a saturated blue, with "blue" being the closest scale, and "indigo" just being further.
	//
	//      C ← Source color
	//       \⟍
	//        \  ⟍
	//         \    ⟍  a
	//        b \      ⟍
	//           \        ⟍
	//            A ------- B
	//            ↑
	//            The color we want to use as the base, which is not influenced by B.

	// We’ll need all the lengths of the triangle sides, named after the angles they look at:
	const a = colorB.distance;
	const b = colorA.distance;
	const c = colorA.color.deltaEOK(colorB.color);

	// We can get the ratios of AD to BD lengths with trigonometry using tangents,
	// as the ratio of the tangents of the opposite angles will match.
	const cosA = (b ** 2 + c ** 2 - a ** 2) / (2 * b * c);
	const radA = Math.acos(cosA);
	const sinA = Math.sin(radA);

	const cosB = (a ** 2 + c ** 2 - b ** 2) / (2 * a * c);
	const radB = Math.acos(cosB);
	const sinB = Math.sin(radB);

	// Tangent of angle C in the ACD triangle
	const tanC1 = cosA / sinA;

	// Tangent of angle C in the BCD triangle
	const tanC2 = cosB / sinB;

	// The ratio of the tangents corresponds to the ratio of the distances AD to BD
	// In the end, it means how much of scale B we want to mix into scale A.
	// If it’s "0" or less, this is an obtuse triangle from case 2, and we use just scale A.
	const ratio = Math.max(0, tanC1 / tanC2) * 0.5;

	// The base scale is going to be a mix of the two closest scales, with the mix ratio we determined before
	const scaleA = scales[colorA.scale];
	const scaleB = scales[colorB.scale];
	const scale = arrayOf12.map((i) =>
		new Color(Color.mix(scaleA[i], scaleB[i], ratio)).to("oklch"),
	) as ArrayOf12<Color>;

	// Get the closest color from the pre-mixed scale we created
	const baseColor = scale.slice().sort((a, b) => source.deltaEOK(a) - source.deltaEOK(b))[0];

	// Note the chroma difference between the source color and the base color
	const ratioC = source.coords[1] / baseColor.coords[1];

	// Modify hue and chroma of the scale to match the source color
	scale.forEach((color) => {
		color.coords[1] = Math.min(source.coords[1] * 1.5, color.coords[1] * ratioC);
		color.coords[2] = source.coords[2];
	});

	// Light mode
	if (scale[0].coords[0] > 0.5) {
		const lightnessScale = scale.map(({ coords }) => coords[0]);
		const backgroundL = Math.max(0, Math.min(1, backgroundColor.coords[0]));
		const newLightnessScale = transposeProgressionStart(
			backgroundL,
			// Add white as the first "step" of the light scale
			[1, ...lightnessScale],
			lightModeEasing,
		);

		// Remove the step we added
		newLightnessScale.shift();

		newLightnessScale.forEach((lightness, i) => {
			scale[i].coords[0] = lightness;
		});

		return scale;
	}

	// Dark mode
	let ease: typeof darkModeEasing = [...darkModeEasing];
	const referenceBackgroundColorL = scale[0].coords[0];
	const backgroundColorL = Math.max(0, Math.min(1, backgroundColor.coords[0]));

	// If background is lighter than step 0, we want to gradually change the easing to linear
	const ratioL = backgroundColorL / referenceBackgroundColorL;

	if (ratioL > 1) {
		const maxRatio = 1.5;

		for (let i = 0; i < ease.length; i++) {
			const metaRatio = (ratioL - 1) * (maxRatio / (maxRatio - 1));
			ease[i] = ratioL > maxRatio ? 0 : Math.max(0, ease[i] * (1 - metaRatio));
		}
	}

	const lightnessScale = scale.map(({ coords }) => coords[0]);
	const backgroundL = backgroundColor.coords[0];
	const newLightnessScale = transposeProgressionStart(backgroundL, lightnessScale, ease);

	newLightnessScale.forEach((lightness, i) => {
		scale[i].coords[0] = lightness;
	});

	return scale;
}

function getTextColor(background: Color) {
	const white = new Color("oklch", [1, 0, 0]);

	if (Math.abs(white.contrastAPCA(background)) < 40) {
		const [, C, H] = background.coords;
		return new Color("oklch", [0.25, Math.max(0.08 * C, 0.04), H]);
	}

	return white;
}

// target = background * (1 - alpha) + foreground * alpha
// alpha = (target - background) / (foreground - background)
// Expects 0-1 numbers for the RGB channels
function getAlphaColor(
	targetRgb: number[],
	backgroundRgb: number[],
	rgbPrecision: number,
	alphaPrecision: number,
	targetAlpha?: number,
) {
	const [tr, tg, tb] = targetRgb.map((c) => Math.round(c * rgbPrecision));
	const [br, bg, bb] = backgroundRgb.map((c) => Math.round(c * rgbPrecision));

	if (
		tr === undefined ||
		tg === undefined ||
		tb === undefined ||
		br === undefined ||
		bg === undefined ||
		bb === undefined
	) {
		throw Error("Color is undefined");
	}

	// Is the background color lighter, RGB-wise, than target color?
	// Decide whether we want to add as little color or as much color as possible,
	// darkening or lightening the background respectively.
	// If at least one of the bits of the target RGB value
	// is lighter than the background, we want to lighten it.
	let desiredRgb = 0;
	if (tr > br) {
		desiredRgb = rgbPrecision;
	} else if (tg > bg) {
		desiredRgb = rgbPrecision;
	} else if (tb > bb) {
		desiredRgb = rgbPrecision;
	}

	const alphaR = (tr - br) / (desiredRgb - br);
	const alphaG = (tg - bg) / (desiredRgb - bg);
	const alphaB = (tb - bb) / (desiredRgb - bb);

	const isPureGray = [alphaR, alphaG, alphaB].every((alpha) => alpha === alphaR);

	// No need for precision gymnastics with pure grays, and we can get cleaner output
	if (!targetAlpha && isPureGray) {
		// Convert back to 0-1 values
		const V = desiredRgb / rgbPrecision;
		return [V, V, V, alphaR] as const;
	}

	const clampRgb = (n: number) => (isNaN(n) ? 0 : Math.min(rgbPrecision, Math.max(0, n)));
	const clampA = (n: number) => (isNaN(n) ? 0 : Math.min(alphaPrecision, Math.max(0, n)));
	const maxAlpha = targetAlpha ?? Math.max(alphaR, alphaG, alphaB);

	const A = clampA(Math.ceil(maxAlpha * alphaPrecision)) / alphaPrecision;
	let R = clampRgb(((br * (1 - A) - tr) / A) * -1);
	let G = clampRgb(((bg * (1 - A) - tg) / A) * -1);
	let B = clampRgb(((bb * (1 - A) - tb) / A) * -1);

	R = Math.ceil(R);
	G = Math.ceil(G);
	B = Math.ceil(B);

	const blendedR = blendAlpha(R, A, br);
	const blendedG = blendAlpha(G, A, bg);
	const blendedB = blendAlpha(B, A, bb);

	// Correct for rounding errors in light mode
	if (desiredRgb === 0) {
		if (tr <= br && tr !== blendedR) {
			R = tr > blendedR ? R + 1 : R - 1;
		}

		if (tg <= bg && tg !== blendedG) {
			G = tg > blendedG ? G + 1 : G - 1;
		}

		if (tb <= bb && tb !== blendedB) {
			B = tb > blendedB ? B + 1 : B - 1;
		}
	}

	// Correct for rounding errors in dark mode
	if (desiredRgb === rgbPrecision) {
		if (tr >= br && tr !== blendedR) {
			R = tr > blendedR ? R + 1 : R - 1;
		}

		if (tg >= bg && tg !== blendedG) {
			G = tg > blendedG ? G + 1 : G - 1;
		}

		if (tb >= bb && tb !== blendedB) {
			B = tb > blendedB ? B + 1 : B - 1;
		}
	}

	// Convert back to 0-1 values
	R = R / rgbPrecision;
	G = G / rgbPrecision;
	B = B / rgbPrecision;

	return [R, G, B, A] as const;
}

// Important – I empirically discovered that this rounding is how the browser actually overlays
// transparent RGB bits over each other. It does NOT round the whole result altogether.
function blendAlpha(foreground: number, alpha: number, background: number, round = true) {
	if (round) {
		return Math.round(background * (1 - alpha)) + Math.round(foreground * alpha);
	}

	return background * (1 - alpha) + foreground * alpha;
}

function getAlphaColorSrgb(targetColor: string, backgroundColor: string, targetAlpha?: number) {
	const [r, g, b, a] = getAlphaColor(
		new Color(targetColor).to("srgb").coords,
		new Color(backgroundColor).to("srgb").coords,
		255,
		255,
		targetAlpha,
	);

	return formatHex(new Color("srgb", [r, g, b], a).toString({ format: "hex" }));
}

function getAlphaColorP3(targetColor: string, backgroundColor: string, targetAlpha?: number) {
	const [r, g, b, a] = getAlphaColor(
		new Color(targetColor).to("p3").coords,
		new Color(backgroundColor).to("p3").coords,
		// Not sure why, but the resulting P3 alpha colors are blended in the browser most precisely when
		// rounded to 255 integers too. Is the browser using 0-255 rather than 0-1 under the hood for P3 too?
		255,
		1000,
		targetAlpha,
	);

	return (
		new Color("p3", [r, g, b], a)
			.toString({ precision: 4 })
			// Important: in non-browser environments colorjs.io outputs a different format for some reason
			.replace("color(p3 ", "color(display-p3 ")
	);
}

// Format shortform hex to longform
function formatHex(str: string) {
	if (!str.startsWith("#")) {
		return str;
	}

	if (str.length === 4) {
		const hash = str.charAt(0);
		const r = str.charAt(1);
		const g = str.charAt(2);
		const b = str.charAt(3);
		return hash + r + r + g + g + b + b;
	}

	if (str.length === 5) {
		const hash = str.charAt(0);
		const r = str.charAt(1);
		const g = str.charAt(2);
		const b = str.charAt(3);
		const a = str.charAt(4);
		return hash + r + r + g + g + b + b + a + a;
	}

	return str;
}

const darkModeEasing = [1, 0, 1, 0] as [number, number, number, number];
const lightModeEasing = [0, 2, 0, 2] as [number, number, number, number];

export function transposeProgressionStart(
	to: number,
	arr: number[],
	curve: [number, number, number, number],
) {
	return arr.map((n, i, arr) => {
		const lastIndex = arr.length - 1;
		const diff = arr[0] - to;
		const fn = BezierEasing(...curve);
		return n - diff * fn(1 - i / lastIndex);
	});
}

export function transposeProgressionEnd(
	to: number,
	arr: number[],
	curve: [number, number, number, number],
) {
	return arr.map((n, i, arr) => {
		const lastIndex = arr.length - 1;
		const diff = arr[lastIndex] - to;
		const fn = BezierEasing(...curve);
		return n - diff * fn(i / lastIndex);
	});
}

// Convert to OKLCH string with percentage for the lightness channel
// https://github.com/radix-ui/themes/issues/420
function toOklchString(color: Color) {
	const L = +(color.coords[0] * 100).toFixed(1);
	return color
		.to("oklch")
		.toString({ precision: 4 })
		.replace(/(\S+)(.+)/, `oklch(${L}%$2`);
}
