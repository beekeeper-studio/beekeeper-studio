declare type Nullable<T> = T | null;

declare interface DOMEvent<T extends EventTarget> extends Event {
  target: T
}
