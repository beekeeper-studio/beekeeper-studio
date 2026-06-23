import _ from "lodash";
import {
  DialectData,
} from "./models";
import { MysqlData } from "./mysql";

export const StarRocksData: DialectData = {
  ...MysqlData,
  disabledFeatures: {
    ...MysqlData.disabledFeatures,
    foreignKeys: true,
    createIndex: true,
    triggers: true,
    generatedColumns: true,
    transactions: true,
    manualCommit: true,
    // StarRocks ALTER is limited and asynchronous, and it rejects DDL inside a
    // transaction. Disable the alter/rename common tests.
    alter: {
      everything: true,
      renameSchema: true,
      renameTable: true,
      renameView: true,
    },
  },
}
