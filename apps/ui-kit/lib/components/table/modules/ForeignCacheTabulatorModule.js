import { Module } from "tabulator-tables";
import _ from "lodash";

export class ForeignCacheTabulatorModule extends Module {
  static moduleName = "foreignCache";
  static moduleInitOrder = 100;

  constructor(table) {
    super(table);
    this.registerComponentFunction("row", "invalidateForeignCache", this.invalidateForeignCache.bind(this));
    this.registerComponentFunction("row", "setForeignData", this.setForeignData.bind(this));
    this.registerComponentFunction("row", "hasForeignData", this.hasForeignData.bind(this));
    this.registerComponentFunction("row", "getExpandablePaths", this.getExpandablePaths.bind(this));
    this.registerComponentFunction("row", "setExpandablePaths", this.setExpandablePaths.bind(this));
    this.registerComponentFunction("row", "pushExpandablePaths", this.pushExpandablePaths.bind(this));
  }

  initialize() {
    this.subscribe("row-init", this.initializeRow.bind(this));
    this.subscribe("row-data-retrieve", this.transformRow.bind(this));
  }

  initializeRow(row) {
    row.modules.foreignCache = {
      data: {},
      expandablePaths: [],
    };
  }

  invalidateForeignCache(row, field) {
    delete row.modules.foreignCache.data[field];
    // remove nested expandable paths
    row.modules.foreignCache.expandablePaths =
      row.modules.foreignCache.expandablePaths.filter((e) => e.path[0] !== field);
  }

  getExpandablePaths(row) {
    return row.modules.foreignCache.expandablePaths;
  }

  setForeignData(row, path, value) {
    _.set(row.modules.foreignCache.data, path, value);
  }

  hasForeignData(row, path) {
    return _.has(row.modules.foreignCache.data, path);
  }

  pushExpandablePaths(row, ...paths) {
    row.modules.foreignCache.expandablePaths.push(...paths);
  }

  setExpandablePaths(row, paths) {
    if (typeof paths === "function") {
      paths = paths(row.modules.foreignCache.expandablePaths);
    }
    row.modules.foreignCache.expandablePaths = paths;
  }

  transformRow(row, type) {
    if (type !== "withForeignData") {
      return row.getData();
    }

    const data = _.cloneDeep(row.getData() || {});

    this.table.columnManager.traverse(function (column) {
      const cache = row.modules.foreignCache.data[column.field];
      if (!cache) return;
      column.setFieldValue(data, cache);
    });

    return data;
  }
}
