// @ts-nocheck Module class not fully typed

import { Module } from "tabulator-tables";

export class HeaderSort extends Module {
  static moduleName = "header-sort";
  static moduleInitOrder = 100;

  initialize() {
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
