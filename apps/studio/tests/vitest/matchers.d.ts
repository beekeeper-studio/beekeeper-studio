import "vitest";

declare module "vitest" {
  interface Assertion<T = any> {
    resolvesWithin(ms: number): Promise<T>;
  }
}
