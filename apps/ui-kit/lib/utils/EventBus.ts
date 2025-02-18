interface EventMap {
  toggleExpandEntityList: boolean;
}

type Callback<T extends keyof EventMap> = (data: EventMap[T]) => void;

const EventBus = {
  events: {},
  emit<T extends keyof EventMap>(event: T, data: EventMap[T]) {
    if (!this.events[event]) {
      return;
    }
    this.events[event].forEach((callback: Callback<T>) => callback(data));
  },
  on<T extends keyof EventMap>(event: T, callback: Callback<T>) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  },
  off<T extends keyof EventMap>(event: T, callback: Callback<T>) {
    if (!this.events[event]) {
      return;
    }
    this.events[event] = this.events[event].filter(
      (item: Callback<T>) => item !== callback
    );
  },
};

export default EventBus;
