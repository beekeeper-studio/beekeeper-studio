import { DriverRequirement, DriverDepProvider, DepPlatform, DepArch } from "./types";

export default class DriverDepRegistry {
  private requirements = new Map<string, DriverRequirement>();
  private providers = new Map<string, DriverDepProvider>();
  private connectionTypeMap = new Map<string, string[]>();

  register(
    requirement: DriverRequirement,
    provider: DriverDepProvider,
    connectionTypes: string[]
  ): void {
    if (requirement.id !== provider.requirementId) {
      throw new Error(
        `Requirement id "${requirement.id}" does not match provider requirementId "${provider.requirementId}"`
      );
    }
    this.requirements.set(requirement.id, requirement);
    this.providers.set(requirement.id, provider);

    for (const ct of connectionTypes) {
      const existing = this.connectionTypeMap.get(ct) ?? [];
      if (!existing.includes(requirement.id)) {
        existing.push(requirement.id);
      }
      this.connectionTypeMap.set(ct, existing);
    }
  }

  getRequirement(id: string): DriverRequirement | undefined {
    return this.requirements.get(id);
  }

  getProvider(requirementId: string): DriverDepProvider | undefined {
    return this.providers.get(requirementId);
  }

  getRequirementsForConnectionType(connectionType: string): DriverRequirement[] {
    const ids = this.connectionTypeMap.get(connectionType) ?? [];
    return ids
      .map((id) => this.requirements.get(id))
      .filter((r): r is DriverRequirement => r !== undefined);
  }

  getAllRequirements(): DriverRequirement[] {
    return Array.from(this.requirements.values());
  }

  hasProvider(requirementId: string): boolean {
    return this.providers.has(requirementId);
  }

  getRequirementBySettingKey(settingKey: string): DriverRequirement | undefined {
    for (const req of this.requirements.values()) {
      if (req.settingKey === settingKey) return req;
    }
    return undefined;
  }
}
