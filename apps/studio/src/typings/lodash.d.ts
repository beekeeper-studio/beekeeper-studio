// somewhere in your project
declare namespace _ {
  interface LoDashStatic {
    deepMapKeys(value: object, fn: (any, string) => string): object;
  }
}
