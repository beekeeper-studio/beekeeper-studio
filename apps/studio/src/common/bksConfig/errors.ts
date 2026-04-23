export class InvalidConfigMetadata extends Error {
  constructor(missingLabels: string[]) {
    let path: string;
    try {
      path = require.resolve("../../config-metadata.json");
    } catch {
      path = "apps/studio/config-metadata.json";
    }
    super(
      `Invalid config metadata: missing labels for ${missingLabels.join(", ")}. Please add labels at ${path}.`
    );
    this.name = "InvalidConfigMetadata";
  }
}

export class UserConfigWriteError extends Error {
  constructor(public readonly filePath: string, public readonly cause: unknown) {
    super(
      `Failed to write user config at ${filePath}: ${
        cause instanceof Error ? cause.message : String(cause)
      }`
    );
    this.name = "UserConfigWriteError";
  }
}
