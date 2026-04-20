import type { IPlatformInfo } from "../IPlatformInfo";
import type { ConfigMetadata, KeybindingSection } from "@/types";
import type { BksConfig } from "./BksConfigProvider";
import { convertKeybinding, ConfigValue } from "./BksConfigProvider";
import { InvalidConfigMetadata } from "./errors";
import defaultMetadata from "../../../config-metadata.json";

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
    const keybindings = this.options.bksConfig.keybindings as Record<
      string,
      ConfigValue
    >;
    const { missingLabels, sections } = this.parseKeybindingSections(
      keybindings,
      ""
    );
    if (missingLabels.length > 0 && !this.options.platformInfo.env.production) {
      throw new InvalidConfigMetadata(missingLabels);
    }
    return sections;
  }

  private parseKeybindingSections(
    obj: Record<string, ConfigValue>,
    parent: string
  ): { sections: KeybindingSection[]; missingLabels: string[] } {
    const sections: KeybindingSection[] = [];
    const missingLabels: string[] = [];

    for (const [sectionName, sectionValue] of Object.entries(obj)) {
      if (typeof sectionValue !== "object" || sectionValue == null) {
        continue;
      }

      const fullSection = parent ? `${parent}.${sectionName}` : sectionName;

      // Group keybindings by action key
      const actionsMap = new Map<
        string,
        { label: string; keybindings: string[][] }
      >();

      for (const [key, value] of Object.entries(sectionValue)) {
        if (typeof value === "string") {
          const { label, missing } = this.getActionLabel(fullSection, key);
          if (missing) {
            missingLabels.push(`keybindings.${fullSection}.${key}`);
          }
          const existing = actionsMap.get(key);
          if (existing) {
            existing.keybindings.push(
              convertKeybinding("ui", value, this.options.platformInfo.platform)
            );
          } else {
            actionsMap.set(key, {
              label,
              keybindings: [
                convertKeybinding(
                  "ui",
                  value,
                  this.options.platformInfo.platform
                ),
              ],
            });
          }
        } else if (Array.isArray(value)) {
          const { label, missing } = this.getActionLabel(fullSection, key);
          if (missing) {
            missingLabels.push(`keybindings.${fullSection}.${key}`);
          }
          const keybindings = value.map((v) =>
            convertKeybinding("ui", v, this.options.platformInfo.platform)
          );
          const existing = actionsMap.get(key);
          if (existing) {
            existing.keybindings.push(...keybindings);
          } else {
            actionsMap.set(key, { label, keybindings });
          }
        } else if (typeof value === "object" && value !== null) {
          // Recurse into nested subsection
          const result = this.parseKeybindingSections(
            { [key]: value },
            fullSection
          );
          sections.push(...result.sections);
          missingLabels.push(...result.missingLabels);
        }
      }

      if (actionsMap.size > 0) {
        const { label: sectionLabel, missing } =
          this.getSectionLabel(fullSection);
        if (missing) {
          missingLabels.push(`keybindings.${fullSection}`);
        }

        const actions: KeybindingSection["actions"] = [];
        for (const [key, { label, keybindings }] of actionsMap) {
          actions.push({ key, label, keybindings });
        }

        sections.push({
          sectionKey: `keybindings.${fullSection}`,
          label: sectionLabel,
          actions,
        });
      }
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
