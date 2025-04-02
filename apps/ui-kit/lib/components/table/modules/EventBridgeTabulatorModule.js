import { Module } from "tabulator-tables";

/** Listen for internal events that are not exposed to the user */
export class EventBridgeTabulatorModule extends Module {
  static moduleName = 'eventBridge';
  static moduleInitOrder = 100;

  initialize() {
		this.subscribe("keybinding-nav-prev", this.keyNavigate.bind(this, "left"), 100_000);
		this.subscribe("keybinding-nav-next", this.keyNavigate.bind(this, "right"), 100_000);
		this.subscribe("keybinding-nav-left", this.keyNavigate.bind(this, "left")), 100_000;
		this.subscribe("keybinding-nav-right", this.keyNavigate.bind(this, "right"), 100_000);
		this.subscribe("keybinding-nav-up", this.keyNavigate.bind(this, "up"), 100_000);
		this.subscribe("keybinding-nav-down", this.keyNavigate.bind(this, "down"), 100_000);
    this.subscribe("sort-changed", this.sortChanged.bind(this));
  }

  keyNavigate(direction) {
    this.dispatchExternal("keyNavigate", direction);
  }

  sortChanged() {
    if (!this.table.initialized) return;
    this.dispatchExternal("sortChanged", this.table.getSorters());
  }
}
