// somewhere in your project
declare namespace _ {
  interface LoDashStatic {
    // eslint-disable-next-line
    deepMapKeys(value: object, fn: (any, string) => string): object;
  }
}
