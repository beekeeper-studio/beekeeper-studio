import { Module, TabulatorFull } from "tabulator-tables";
import _ from "lodash";
import Vue from "vue";
import { UtilityConnection } from "@/lib/utility/UtilityConnection";
import rawLog from "@bksLogger";

const log = rawLog.scope("AppDBPersistenceTabulatorModule");

export interface AppDBPersistenceOptions {
  workspaceId?: number;
  connectionId: number;
  schema?: string;
  table: string;
}

declare module "tabulator-tables" {
  interface Options {
    appDBPersistence?: AppDBPersistenceOptions;
  }
}

/**
 * Persists tabulator column layout (widths, order, visibility) to appdb's
 * `tabulator_state` table, keyed by (workspaceId, connectionId, schema, table).
 *
 * Enable by passing the option:
 *
 *   appDBPersistence: { workspaceId, connectionId, schema, table }
 *
 * On table-built the module loads the stored layout and applies it via
 * `setColumnLayout`. On column resize / move / show / hide it writes the
 * current layout (debounced) via `getColumnLayout`.
 */
export class AppDBPersistenceTabulatorModule extends Module {
  static moduleName = "appDBPersistence";
  static moduleInitOrder = 100;

  static util = {
    send: ((...args) =>
      Vue.prototype.$util.send(...args)) as UtilityConnection["send"],
  };

  constructor(table: TabulatorFull) {
    super(table);
    this.registerTableOption("appDBPersistence", undefined);
  }

  initialize() {
    const opts = this.table.options.appDBPersistence;

    if (!opts) {
      return;
    }

    const key = {
      workspaceId: opts.workspaceId ?? -1,
      connectionId: opts.connectionId,
      schema: opts.schema || "",
      table: opts.table,
    };

    let rowId;

    const save = _.debounce(async () => {
      try {
        const saved = await AppDBPersistenceTabulatorModule.util.send(
          "appdb/tabulatorState/save",
          {
            obj: {
              id: rowId,
              ...key,
              value: this.table.getColumnLayout(),
            },
          }
        );
        if (saved?.id) rowId = saved.id;
      } catch (err) {
        log.error("Failed to save tabulator state", err);
      }
    }, 250);

    this.subscribe("table-built", async () => {
      try {
        const row = await AppDBPersistenceTabulatorModule.util.send(
          "appdb/tabulatorState/findOneBy",
          { options: key }
        );
        if (row) {
          rowId = row.id;
          if (row.value) {
            this.table.setColumnLayout(row.value);
          }
        }
      } catch (err) {
        log.error("Failed to load tabulator state", err);
      }
    });

    this.subscribe("column-resized", save);
    this.subscribe("column-moved", save);
    this.subscribe("column-show", save);
    this.subscribe("column-hide", save);
  }
}
