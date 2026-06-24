declare namespace jest {
  interface Matchers<R> {
    resolvesWithin(ms: number): Promise<R>;
  }
}
