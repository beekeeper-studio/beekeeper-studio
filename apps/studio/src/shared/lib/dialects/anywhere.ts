import _ from "lodash";
import { defaultEscapeString, DialectData } from "./models";

export const SqlAnywhereData: DialectData = {
  defaultSchema: 'dbo',
  wrapIdentifier: (value) =>   _.isString(value) ?
    (value !== '*' ? `[${value.replace(/\]/g, ']]')}]` : '*') : value,
  escapeString: defaultEscapeString,
  disabledFeatures: {
    shell: true,
    alter: {
      multiStatement: true,
      renameSchema: true,
      reorderColumn: true
    }
  }
}
