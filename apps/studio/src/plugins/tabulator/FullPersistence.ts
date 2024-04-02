// @ts-nocheck Module class not fully typed

import { isBksInternalColumn } from "@/common/utils";
import { Module } from "tabulator-tables";

// We do this because after calling redraw the widths of all columns are reset.
export class FullPersistence extends Module {
  static moduleName = "full-persistence";

  constructor(table) {
    super(table);

    this.id = null;
    this.state = null;

    this.registerTableOption("fullPersistenceId", null);
		this.registerTableFunction("persistenceDelete", this.delete.bind(this));
		this.registerTableFunction("persistenceSaveColumn", this.saveColumn.bind(this));
    this.registerComponentFunction("column", "persistenceSave", this.saveColumn.bind(this));
  }

  initialize() {
    this.id = this.options("fullPersistenceId");

    if (!this.id) {
      return;
    }

    this.loadState();

    this.subscribe("table-redraw", this.handleTableRedraw.bind(this));
    this.subscribe("table-destroy", this.delete.bind(this));
    this.subscribe("column-show", this.saveColumn.bind(this));
    this.subscribe("column-hide", this.saveColumn.bind(this));
    this.subscribe("column-resized", this.saveColumn.bind(this));

    /**
     * `column-width` is called so frequently that it's hard to determine which
     * one comes from the user.
     **/
    // this.subscribe("column-width", this.saveColumn.bind(this));
  }

  saveColumn(column) {
    if (column._column) {
      column = column._column;
    }

    if (isBksInternalColumn(column.field)) {
      return;
    }

    this.state.columns[column.field] = {
      width: column.getWidth(),
      visible: column.visible,
    }

    this.saveState();
  }

  saveState() {
    window.localStorage.setItem(this.id, JSON.stringify(this.state));
  }

  loadState() {
    const state = window.localStorage.getItem(this.id);
    if (state) {
      this.state = JSON.parse(state);
    } else {
      this.resetState();
    }
  }

  resetState() {
    this.state = {
      columns: {},
    };
    this.saveState();
  }

  delete() {
    window.localStorage.removeItem(this.id);
  }

  setId(id: string) {
    this.delete();
    this.id = id;
    this.saveState();
  }

  handleTableRedraw() {
    for (const field in this.state.columns) {
      const column = this.table.getColumn(field);
      const state = this.state.columns[field];

      if (!column) {
        continue
      }

      column.setWidth(state.width);
      if (state.visible) {
        column.show()
      } else {
        column.hide()
      }
    }
  }
}
