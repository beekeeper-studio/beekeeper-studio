// Copyright (c) 2015 The SQLECTRON Team
import _ from 'lodash'
import logRaw from 'electron-log'
import { TableDelete, TableInsert, TableUpdate } from '../models'

const log = logRaw.scope('db/util')


export function escapeString(value) {
  if (_.isNil(value)) return null
  return value.toString().replaceAll("'", "''")
}

export function escapeLiteral(value) {
  if (_.isNil(value)) return null
  return value.toString().replaceAll(';', '')
}

export function joinQueries(queries) {
  const results = queries.map((sql) => {
    return sql.match(/;\s*$/g) ? sql : `${sql};`
  })
  return results.join("")
}


export function buildSchemaFilter(filter, schemaField = 'schema_name') {
  if (!filter) return null
  const { schema, only, ignore } = filter

  if (schema) {
    return `${schemaField} = '${schema}'`;
  }

  const where = [];

  if (only && only.length) {
    where.push(`${schemaField} IN (${only.map((name) => `'${name}'`).join(',')})`);
  }

  if (ignore && ignore.length) {
    where.push(`${schemaField} NOT IN (${ignore.map((name) => `'${name}'`).join(',')})`);
  }

  return where.join(' AND ');
}

export function buildDatabseFilter(filter, databaseField) {
  if (!filter) {
    return null
  }
  const { only, ignore, database } = filter

  if (database) {
    return `${databaseField} = '${database}'`;
  }

  const where = [];

  if (only && only.length) {
    where.push(`${databaseField} IN (${only.map((name) => `'${name}'`).join(',')})`);
  }

  if (ignore && ignore.length) {
    where.push(`${databaseField} NOT IN (${ignore.map((name) => `'${name}'`).join(',')})`);
  }

  return where.join(' AND ');
}

function wrapIdentifier(value) {
  return (value !== '*' ? `\`${value.replace(/`/g, '``')}\`` : '*');
}


export function buildFilterString(filters, columns = []) {
  let filterString = ""
  let filterParams = []
  if (filters && _.isArray(filters) && filters.length > 0) {
    filterString = "WHERE " + filters.map((item) => {
      const column = columns.find((c) => c.columnName === item.field)
      if (column && column.dataType.toUpperCase().includes('BINARY')) {
        return `HEX(${wrapIdentifier(item.field)}) ${item.type} ?`
      }
      return `${wrapIdentifier(item.field)} ${item.type} ?`
    }).join(" AND ")

    filterParams = filters.map((item) => {
      return item.value
    })
  }
  return {
    filterString, filterParams
  }
}

export function buildSelectTopQuery(table, offset, limit, orderBy, filters, countTitle = 'total', columns = []) {
  log.debug('building selectTop for', table, offset, limit, orderBy)
  let orderByString = ""

  if (orderBy && orderBy.length > 0) {
    orderByString = "order by " + (orderBy.map((item: any) => {
      if (_.isObject(item)) {
        return `\`${item['field']}\` ${item['dir']}`
      } else {
        return `\`${item}\``
      }
    })).join(",")
  }
  let filterString = ""
  let filterParams = []
  if (_.isString(filters)) {
    filterString = `WHERE ${filters}`
  } else {
    const filterBlob = buildFilterString(filters, columns)
    filterString = filterBlob.filterString
    filterParams = filterBlob.filterParams
  }

  const baseSQL = `
    FROM \`${table}\`
    ${filterString}
  `
  const countSQL = `
    select count(*) as ${countTitle} ${baseSQL}
  `
  const sql = `
    SELECT * ${baseSQL}
    ${orderByString}
    ${_.isNumber(limit) ? `LIMIT ${limit}` : ''}
    ${_.isNumber(offset) ? `OFFSET ${offset}` : ""}
    `
    return {query: sql, countQuery: countSQL, params: filterParams}
}

export async function executeSelectTop(queries, conn, executor) {
  const { query, params } = queries
  const result = await executor(conn, { query, params })
  return {
    result: result.data,
    fields: Object.keys(result.data[0] || {})
  }
}

export async function genericSelectTop(conn, table, offset, limit, orderBy, filters, executor){
  const queries = buildSelectTopQuery(table, offset, limit, orderBy, filters)
  return await executeSelectTop(queries, conn, executor)
}

export function buildInsertQuery(knex, insert: TableInsert, columns = []) {

  const data = _.cloneDeep(insert.data)
  data.forEach((item) => {
    const insertColumns = Object.keys(item)
    insertColumns.forEach((ic) => {
      const matching = _.find(columns, (c) => c.columnName === ic)
      if (matching && matching.dataType && matching.dataType.startsWith('bit(')) {
        if (matching.dataType === 'bit(1)') {
          item[ic] = _.toNumber(item[ic])
        } else {
          item[ic] = parseInt(item[ic].split("'")[1], 2)
        }
      }
    })

  })
  const builder = knex(insert.table)
  if (insert.schema) {
    builder.withSchema(insert.schema)
  }
  const query = builder
    .insert(data)
    .toQuery()
  return query
}

export function buildInsertQueries(knex, inserts) {
  return inserts.map(insert => buildInsertQuery(knex, insert))
}

export function buildUpdateQueries(knex, updates: TableUpdate[]) {
  return updates.map(update => {
    const where = {}
    const updateblob = {}
    console.log(update)
    update.primaryKeys.forEach(({column, value}) => {
      where[column] = value
    })

    updateblob[update.column] = update.value

    const query = knex(update.table)
      .withSchema(update.schema)
      .where(where)
      .update(updateblob)
      .toQuery()
    return query
  })
}

export function buildSelectQueriesFromUpdates(knex, updates: TableUpdate[]) {
  return updates.map(update => {
    const where = {}
    update.primaryKeys.forEach(({ column, value }) => {
      where[column] = value
    })

    const query = knex(update.table)
      .withSchema(update.schema)
      .where(where)
      .select('*')
      .toQuery()
    return query
  })
}

export async function withClosable<T>(item, func): Promise<T> {
  try {
    return await func(item)
  } finally {
    if (item) {
      await item.close();
    }
  }

}

export function buildDeleteQueries(knex, deletes: TableDelete[]) {
  return deletes.map(deleteRow => {
    const where = {}

    deleteRow.primaryKeys.forEach(({ column, value }) => {
      where[column] = value
    })

    return knex(deleteRow.table)
      .withSchema(deleteRow.schema)
      .where(where)
      .delete()
      .toQuery()
  })
}
