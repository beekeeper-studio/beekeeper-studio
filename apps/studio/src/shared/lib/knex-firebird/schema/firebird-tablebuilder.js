import TableBuilder from 'knex/lib/schema/tablebuilder'
import { isObject } from 'lodash';

export default class TableBuilder_Firebird extends TableBuilder {
  timestamps(useTimestamps, _defaultToNow, useCamelCase) {
    if (isObject(useTimestamps)) {
      ({ useTimestamps, defaultToNow, useCamelCase } = useTimestamps);
    }
    const method = useTimestamps === true ? 'timestamp' : 'datetime';
    this[method](useCamelCase ? 'createdAt' : 'created_at');
    this[method](useCamelCase ? 'updatedAt' : 'updated_at');
  }
}

