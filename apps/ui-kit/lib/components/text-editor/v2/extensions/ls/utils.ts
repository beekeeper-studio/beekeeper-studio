import { ExtendedFeatureOptions, LanguageServerConfiguration } from "../../types";

export function posToOffset(doc, pos) {
  if (pos.line >= doc.lines) {
    // Next line (implying the end of the document)
    if (pos.character === 0) {
      return doc.length;
    }
    return;
  }
  const offset = doc.line(pos.line + 1).from + pos.character;
  if (offset > doc.length) {
    return;
  }
  return offset;
}

const extendedFeatures: ExtendedFeatureOptions = {
  semanticTokensEnabled: true,
}

export function isFeatureEnabled(
  config: LanguageServerConfiguration,
  feature: keyof LanguageServerConfiguration["features"]
) {
  if (!config.features) {
    return extendedFeatures[feature];
  }
  return config.features[feature];
}
