import { Module } from "tabulator-tables";

export class HeaderSortTabulatorModule extends Module {
  static moduleInitOrder = 100;

  initialize() {
    // @ts-expect-error Module class not fully typed
    this.subscribe("column-layout", this.moveSorterToTitleElement.bind(this));
  }

  moveSorterToTitleElement(column) {
    const arrowEl = column.titleHolderElement.querySelector(
      ".tabulator-col-sorter"
    );
    if (arrowEl) {
      column.titleElement.insertBefore(arrowEl, column.titleElement.firstChild);
    }
  }
}
