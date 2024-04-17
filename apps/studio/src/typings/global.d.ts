declare type Nullable<T> = T | null;

declare interface DOMEvent<T extends EventTarget> extends Event {
  target: T;
}

/**
 * Ref: https://stackoverflow.com/a/66661477/10012118
 * with little modifications
 */
declare type DeepKeyOf<T> = (
  [T] extends [never]
    ? ""
    : T extends Record<string, any>
    ? {
        [K in Exclude<keyof T, symbol>]: `${K}${DotPrefix<DeepKeyOf<T[K]>>}`;
      }[Exclude<keyof T, symbol>]
    : ""
) extends infer D
  ? Extract<D, string>
  : never;

type DotPrefix<T extends string> = T extends "" ? "" : `.${T}`;

