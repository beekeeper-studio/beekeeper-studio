import type { PluginSnapshot } from "./types";

/**
 * User-facing copy explaining why a plugin is unavailable.
 *
 * This is the single source of that copy. The plugin manager's disabled-state
 * alert and every AI entry point tooltip read from here so the same condition
 * is never described two different ways.
 *
 * Availability is always derived from a plugin's resolved snapshot, never from
 * raw config flags: `pluginSystem.disabled` is `true` on a stock install (with
 * the bundled plugins allow-listed), so reading that flag directly would report
 * every bundled plugin as unavailable.
 */

/** Why a plugin snapshot is disabled. Mirrors the plugin manager's alert. */
export function disabledStateMessage(snapshot: PluginSnapshot): string {
  const name = snapshot.manifest.name;

  if (!snapshot.disableState.disabled) {
    return "";
  }

  switch (snapshot.disableState.reason) {
    case "plugin-system-disabled":
      return window.bksConfig.pluginSystem.allow.length === 0
        ? `${name} is not available because the plugin system has been disabled.`
        : `The plugin system is disabled. ${name} is not included in the list of allowed plugins.`;
    case "community-plugins-disabled":
      return `${name} is a community plugin. Community plugins are disabled via configuration.`;
    case "disabled-by-config":
      return `${name} has been disabled via configuration.`;
    default:
      return `${name} is currently disabled.`;
  }
}

/**
 * Returns a sentence explaining why the plugin can't be used right now, or
 * `null` when it is available.
 *
 * @param snapshot the plugin's resolved snapshot, or `undefined` when the
 *   plugin isn't installed.
 * @param fallbackName display name to use when there is no manifest to read.
 */
export function pluginUnavailableReason(
  snapshot: PluginSnapshot | undefined,
  fallbackName: string
): string | null {
  if (!snapshot) {
    return `${fallbackName} is not installed.`;
  }

  if (!snapshot.loadable) {
    return `${snapshot.manifest.name} isn't compatible with this version of Beekeeper Studio. It requires version ${snapshot.manifest.minAppVersion} or newer.`;
  }

  if (snapshot.disableState.disabled) {
    return disabledStateMessage(snapshot);
  }

  return null;
}
