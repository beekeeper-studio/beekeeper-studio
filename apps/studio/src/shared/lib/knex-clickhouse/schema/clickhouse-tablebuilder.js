const TableBuilder = require('knex/lib/schema/tablebuilder');
import { isObject } from 'lodash';

class TableBuilder_ClickHouse extends TableBuilder {
  timestamps(useTimestamps, defaultToNow, useCamelCase) {
    if (isObject(useTimestamps)) {
      ({ useTimestamps, defaultToNow, useCamelCase } = useTimestamps);
    }
    const method = useTimestamps === true ? 'timestamp' : 'datetime';
    const createdAt = this[method](useCamelCase ? 'createdAt' : 'created_at');
    const updatedAt = this[method](useCamelCase ? 'updatedAt' : 'updated_at');

    if (defaultToNow === true) {
      const now = this.client.raw('now()');
      createdAt.notNullable().defaultTo(now);
      updatedAt.notNullable().defaultTo(now);
    }
  }
}

module.exports = TableBuilder_ClickHouse;
