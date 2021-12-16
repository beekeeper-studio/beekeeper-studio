// somewhere in your project
declare module _ {
  interface LoDashStatic {
    deepMapKeys(value: object, fn: (any, string) => string): object;
  }
}
