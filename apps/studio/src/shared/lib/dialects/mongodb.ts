import { DialectData } from "./models";

export const MongoDBData: DialectData = {
  columnTypes: [],
  usesOffsetPagination: true,
  disabledFeatures: {
    comments: true,
    alter: {
      addColumn: true,
      dropColumn: true,
      renameColumn: true,
      alterColumn: true,
      multiStatement: true,
      addConstraint: true,
      dropConstraint: true,
      indexes: true,
      renameSchema: true,
      renameTable: true,
      renameView: true,
      reorderColumn: true
    },
    triggers: true,
    relations: true
  }
}
