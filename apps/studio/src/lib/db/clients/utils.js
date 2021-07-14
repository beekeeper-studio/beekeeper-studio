// Copyright (c) 2015 The SQLECTRON Team
import _ from 'lodash'
import logRaw from 'electron-log'

const log = logRaw.scope('db/util')


export function escapeString(value) {
  if (_.isNil(value)) return null
  return value.replaceAll("'", "''")
}

export function escapeLiteral(value) {
  return value.replaceAll(';', '')
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


export function buildFilterString(filters) {
  let filterString = ""
  let filterParams = []
  if (filters && _.isArray(filters) && filters.length > 0) {
    filterString = "WHERE " + filters.map((item) => {
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

export function buildSelectTopQuery(table, offset, limit, orderBy, filters, countTitle = 'total') {
  log.debug('building selectTop for', table, offset, limit, orderBy)
  let orderByString = ""

  if (orderBy && orderBy.length > 0) {
    orderByString = "order by " + (orderBy.map((item) => {
      if (_.isObject(item)) {
        return `\`${item.field}\` ${item.dir}`
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
    const filterBlob = buildFilterString(filters)
    filterString = filterBlob.filterString
    filterParams = filterBlob.filterParams
  }

  let baseSQL = `
    FROM \`${table}\`
    ${filterString}
  `
  let countSQL = `
    select count(*) as ${countTitle} ${baseSQL}
  `
  let sql = `
    SELECT * ${baseSQL}
    ${orderByString}
    ${_.isNumber(limit) ? `LIMIT ${limit}` : ''}
    ${_.isNumber(offset) ? `OFFSET ${offset}` : ""}
    `
    return {query: sql, countQuery: countSQL, params: filterParams}
}

export async function executeSelectTop(queries, conn, executor) {
  const { query, countQuery, params } = queries
  const countResults = await executor(conn, { query: countQuery, params })
  const result = await executor(conn, { query, params })
  const rowWithTotal = countResults.data.find((row) => { return row.total })
  const totalRecords = rowWithTotal ? rowWithTotal.total : 0
  return {
    result: result.data,
    totalRecords: Number(totalRecords),
    fields: Object.keys(result.data[0] || {})
  }  
}

export async function genericSelectTop(conn, table, offset, limit, orderBy, filters, executor){
  const queries = buildSelectTopQuery(table, offset, limit, orderBy, filters)
  return await executeSelectTop(queries, conn, executor)
}

export function buildInsertQueries(knex, inserts) {
  return inserts.map(insert => {
    const query = knex(insert.table)
      .withSchema(insert.schema)
      .insert(insert.data)
      .toQuery()
    return query
  })
}

export function buildUpdateQueries(knex, updates) {
  return updates.map(update => {
    const where = {}
    const updateblob = {}
    where[update.pkColumn] = update.primaryKey
    updateblob[update.column] = update.value

    const query = knex(update.table)
      .withSchema(update.schema)
      .where(where)
      .update(updateblob)
      .toQuery()
    return query
  })
}

export function buildSelectQueriesFromUpdates(knex, updates) {
  return updates.map(update => {
    const where = {}
    where[update.pkColumn] = update.primaryKey

    const query = knex(update.table)
      .withSchema(update.schema)
      .where(where)
      .select('*')
      .toQuery()
    return query
  })
}

export function buildDeleteQueries(knex, deletes) {
  return deletes.map(deleteRow => {
    let where = {}
    where[deleteRow.pkColumn] = deleteRow.primaryKey
    
    return knex(deleteRow.table)
      .withSchema(deleteRow.schema)
      .where(where)
      .delete()
      .toQuery()
  })
}
