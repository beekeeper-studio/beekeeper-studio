import { DialectData } from "./models";

export const MongoDBData: DialectData = {
  columnTypes: [],
  usesOffsetPagination: true,
  disabledFeatures: {
    queryEditor: true,
    nullable: true,
    defaultValue: true,
    primary: true,
    comments: true,
    index: {
      id: true,
      primary: true
    },
    informationSchema: {
      extra: true
    },
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
