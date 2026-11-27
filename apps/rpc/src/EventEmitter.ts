type Listener = (...args: any[]) => void;

export class EventEmitter<EventMap extends Record<keyof EventMap, Listener>> {
  private eventListeners = new Map<keyof EventMap, EventMap[keyof EventMap][]>();

  on<K extends keyof EventMap>(eventName: K, listener: EventMap[K]) {
    const listeners = this.eventListeners.get(eventName) ?? [];
    this.eventListeners.set(eventName, [...listeners, listener]);
  }

  off<K extends keyof EventMap>(eventName: K, listener: EventMap[K]) {
    const listeners = this.eventListeners.get(eventName) ?? [];
    this.eventListeners.set(
      eventName,
      listeners.filter((l) => l !== listener)
    );
  }

  protected emit<K extends keyof EventMap>(
    eventName: K,
    ...args: Parameters<EventMap[K]>
  ) {
    const listeners = this.eventListeners.get(eventName) ?? [];
    for (const listener of listeners) {
      listener(...args);
    }
  }
}
