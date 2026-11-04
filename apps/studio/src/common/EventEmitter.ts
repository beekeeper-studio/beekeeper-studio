type Listener = (...args: any[]) => void;

export class EventEmitter<EventMap extends Record<keyof EventMap, Listener>> {
  private listeners = new Map<keyof EventMap, EventMap[keyof EventMap][]>();

  on<K extends keyof EventMap>(eventName: K, listener: EventMap[K]) {
    const listeners = this.listeners.get(eventName) ?? [];
    this.listeners.set(eventName, [...listeners, listener]);
  }

  off<K extends keyof EventMap>(eventName: K, listener: EventMap[K]) {
    const listeners = this.listeners.get(eventName) ?? [];
    this.listeners.set(
      eventName,
      listeners.filter((l) => l !== listener)
    );
  }

  protected emit<K extends keyof EventMap>(
    eventName: K,
    ...args: Parameters<EventMap[K]>
  ) {
    const listeners = this.listeners.get(eventName) ?? [];
    for (const listener of listeners) {
      listener(...args);
    }
  }
}
