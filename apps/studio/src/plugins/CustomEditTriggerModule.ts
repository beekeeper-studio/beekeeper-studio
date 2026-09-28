import { Module } from "tabulator-tables";

export class CustomEditTriggerModule extends Module {
  static moduleName = "customEditTrigger";

  constructor(table) {
    super(table);

    this.handleKeydown = this.handleKeydown.bind(this);
    this.addListener = this.addListener.bind(this);
    this.removeListener = this.removeListener.bind(this);
  }

  initialize() {
    this.subscribe("cell-editing", this.removeListener);
    this.subscribe("edit-editor-clear", this.addListener);
    this.subscribe("table-destroy", this.removeListener);

    this.addListener();
  }

  private addListener() {
    this.table.element.addEventListener("keydown", this.handleKeydown);
  }

  private removeListener() {
    this.table.element.removeEventListener("keydown", this.handleKeydown);
  }

  private handleKeydown(event: KeyboardEvent) {
    if (event.ctrlKey || event.altKey || event.metaKey) {
      return;
    }

    // - Ignore named keys like "Enter" or "ArrowUp"
    // - Also check `isComposing` to support chinese characters, japanese, etc.
    if (event.isComposing || [...event.key].length !== 1) {
      return;
    }

    const cell = this.table.modules.selectRange?.getActiveCell()?.getComponent();
    if (!cell) {
      return;
    }

    event.preventDefault();
    cell.edit(false, event.key);
  }
}
