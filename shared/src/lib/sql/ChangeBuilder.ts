import { Dialect, SchemaItem } from "../dialects/models";
import { PostgresqlChangeBuilder } from "./change_builder/PostgresqlChangeBuilder";


export const ChangeBuilder = {
  for: (dialect: Dialect, table: string, schema?: string, columns?: SchemaItem[]) => {
    switch (dialect) {
      case 'postgresql':
        return new PostgresqlChangeBuilder()
        break;
      default:
        return new GenericChangeBuilder()
        break;
    }
  }
}

