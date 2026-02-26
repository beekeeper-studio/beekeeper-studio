import type { IPlatformInfo } from "../IPlatformInfo";
import type { ConfigMetadata, KeybindingSection } from "@/types";
import type { BksConfig, KeybindingPath } from "./BksConfigProvider";
import { InvalidConfigMetadata } from "./errors";
import defaultMetadata from "../../../config-metadata.json";
import { recurse } from "@/config/helpers";

/**
 * Provides UI-specific config functionality that requires metadata.
 * This class is only used in the renderer process (frontend).
 *
 * If `metadata` is not provided in options, it defaults to the metadata
 * defined in `apps/studio/config-metadata.json`.
 */
export class ConfigMetadataProvider {
  constructor(
    readonly options: {
      bksConfig: BksConfig;
      platformInfo: IPlatformInfo;
      metadata?: ConfigMetadata;
    }
  ) { }

  private get metadata(): ConfigMetadata {
    return this.options.metadata ?? defaultMetadata;
  }

  /**
   * Returns all keybinding sections with UI-formatted keybindings.
   * This method returns the full structure of sections and their keybindings
   * for use in UI (e.g., keyboard shortcuts modal, settings).
   */
  getKeybindingSections(): KeybindingSection[] {
    const { missingLabels, sections } = this.parseKeybindingSections();
    if (missingLabels.length > 0 && !this.options.platformInfo.env.production) {
      throw new InvalidConfigMetadata(missingLabels);
    }
    return sections;
  }

  private parseKeybindingSections(): {
    sections: KeybindingSection[];
    missingLabels: string[];
  } {
    const missingLabels: string[] = [];
    const sectionsMap = new Map<string, KeybindingSection['actions']>();

    for (let { key: actionKey, path } of recurse(
      this.options.bksConfig.keybindings
    )) {
      const sectionKey = path.slice(0, -1).join(".");
      const fullKey = path.join(".") as KeybindingPath;
      const { label, missing } = this.getActionLabel(sectionKey, actionKey);

      if (missing) {
        missingLabels.push(`keybindings.${sectionKey}.${actionKey}`);
      }

      const keybindings = this.options.bksConfig.getKeybindings("ui", fullKey);

      if (keybindings.length === 0) {
        continue;
      }

      if (!sectionsMap.has(sectionKey)) {
        sectionsMap.set(sectionKey, []);
      }

      sectionsMap.get(sectionKey).push({ key: actionKey, label, keybindings });
    }

    const sections: KeybindingSection[] = [];

    for (const [sectionKey, actions] of sectionsMap.entries()) {
      const { label, missing } = this.getSectionLabel(sectionKey);

      if (missing) {
        missingLabels.push(`keybindings.${sectionKey}`);
      }

      sections.push({
        sectionKey: `keybindings.${sectionKey}`,
        label,
        actions,
      });
    }

    return { sections, missingLabels };
  }

  private getSectionLabel(section: string): {
    label: string;
    missing: boolean;
  } {
    // Skip plugins section - plugins handle their own labels
    if (section.startsWith("plugins")) {
      return { label: section, missing: false };
    }

    const sectionMeta = this.metadata.sections.find(
      (s) => s.key === `keybindings.${section}`
    );

    return {
      label: sectionMeta?.label ?? section,
      missing: !sectionMeta,
    };
  }

  private getActionLabel(
    section: string,
    action: string
  ): { label: string; missing: boolean } {
    // Skip plugins section - plugins handle their own labels
    if (section.startsWith("plugins")) {
      return { label: action, missing: false };
    }

    const sectionMeta = this.metadata.sections.find(
      (s) => s.key === `keybindings.${section}`
    );

    const actionMeta = sectionMeta?.properties.find((p) => p.key === action);

    return {
      label: actionMeta?.label ?? action,
      missing: !actionMeta,
    };
  }
}
