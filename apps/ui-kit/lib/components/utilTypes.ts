import { PropType } from "vue";

type InferPropType<T> =
  T extends { type: PropType<infer V> } ? V :
  T extends { type: () => infer V } ? V :
  T extends { default: infer V } ? V :
  any;

export type PropsToType<P> = {
  [K in keyof P]: InferPropType<P[K]>
}

export interface VueWrapper<Element extends HTMLElement, EventMap extends HTMLElementEventMap> extends HTMLElement {
  vueComponent: {
    $destroy: () => void
  }

  addEventListener<K extends keyof EventMap>(
    type: K,
    listener: (this: Element, ev: EventMap[K]) => any,
    options?: boolean | AddEventListenerOptions
  ): void;
  removeEventListener<K extends keyof EventMap>(
    type: K,
    listener: (this: Element, ev: EventMap[K]) => any,
    options?: boolean | EventListenerOptions
  ): void;
}

// make a constant array from object keys
// credits goes to https://twitter.com/WrocTypeScript/status/1306296710407352321
export type TupleUnion<U extends string, R extends any[] = []> = {
  [S in U]: Exclude<U, S> extends never ? [...R, S] : TupleUnion<Exclude<U, S>, [...R, S]>;
}[U];

