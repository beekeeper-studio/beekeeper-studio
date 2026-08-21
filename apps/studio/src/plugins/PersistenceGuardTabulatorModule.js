import { Module } from "tabulator-tables";

/** Suppress the build-time save burst that clobbers persisted column widths. */
export class PersistenceGuardTabulatorModule extends Module {
  static moduleName = "persistenceGuard";
  static moduleInitOrder = 100;

  initialize() {
    const persistence = this.table.modules.persistence;

    if (!persistence.writeFunc) {
      return;
    }

    const writeFunc = persistence.writeFunc;
    persistence.writeFunc = () => {};

    // Priority runs this after persistence's own layout-refreshed save,
    // so the first layout stays suppressed.
    this.subscribe(
      "layout-refreshed",
      () => {
        persistence.writeFunc = writeFunc;
      },
      200_000
    );
  }
}
