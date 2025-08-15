export type TestManifestOptions = {
  version: string;
  minAppVersion: string;
}

export function createTestManifest(options: TestManifestOptions) {
  return {
    id: "test-plugin",
    name: "Test Plugin",
    version: options.version,
    author: "John Doe",
    description: "This is a test plugin.",
    minAppVersion: options.minAppVersion,
  };
}
