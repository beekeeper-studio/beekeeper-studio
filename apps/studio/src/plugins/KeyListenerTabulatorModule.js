import { Module } from "tabulator-tables";

/** Listen to internal key nav events and send them to external */
export class KeyListenerTabulatorModule extends Module {
  static moduleName = 'keyListener';
  static moduleInitOrder = 100;

  initialize() {
		this.subscribe("keybinding-nav-prev", this.keyNavigate.bind(this, "left"), 100_000);
		this.subscribe("keybinding-nav-next", this.keyNavigate.bind(this, "right"), 100_000);
		this.subscribe("keybinding-nav-left", this.keyNavigate.bind(this, "left")), 100_000;
		this.subscribe("keybinding-nav-right", this.keyNavigate.bind(this, "right"), 100_000);
		this.subscribe("keybinding-nav-up", this.keyNavigate.bind(this, "up"), 100_000);
		this.subscribe("keybinding-nav-down", this.keyNavigate.bind(this, "down"), 100_000);
  }

  keyNavigate(direction) {
    this.dispatchExternal("keyNavigate", direction);
  }
}
