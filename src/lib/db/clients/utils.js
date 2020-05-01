// Copyright (c) 2015 The SQLECTRON Team

export function buildSchemaFilter({ schema } = {}, schemaField = 'schema_name') {
  if (!schema) { return null; }

  if (typeof schema === 'string') {
    return `${schemaField} = '${schema}'`;
  }

  const where = [];
  const { only, ignore } = schema;

  if (only && only.length) {
    where.push(`${schemaField} IN (${only.map((name) => `'${name}'`).join(',')})`);
  }

  if (ignore && ignore.length) {
    where.push(`${schemaField} NOT IN (${ignore.map((name) => `'${name}'`).join(',')})`);
  }

  return where.join(' AND ');
}

export function buildDatabseFilter({ database } = {}, databaseField) {
  if (!database) { return null; }

  if (typeof database === 'string') {
    return `${databaseField} = '${database}'`;
  }

  const where = [];
  const { only, ignore } = database;

  if (only && only.length) {
    where.push(`${databaseField} IN (${only.map((name) => `'${name}'`).join(',')})`);
  }

  if (ignore && ignore.length) {
    where.push(`${databaseField} NOT IN (${ignore.map((name) => `'${name}'`).join(',')})`);
  }

  return where.join(' AND ');
}

export function buildSelectTopQuery(table, offset, limit, orderBy, filters) {
  let orderByString = ""
  let filterString = ""
  let filterParams = []

  if (orderBy && orderBy.length > 0) {
    orderByString = "order by " + (orderBy.map((item) => {
      if (Array.isArray(item)) {
        return item.join(" ")
      } else {
        return item
      }
    })).join(",")
  }

  if (filters && filters.length > 0) {
    filterString = "WHERE " + filters.map((item) => {
      return `${item.field} ${item.type} ?`
    }).join(" AND ")

    filterParams = filters.map((item) => {
      return item.value
    })
  }

  let baseSQL = `
    FROM ${table}
    ${filterString}
  `
  let countSQL = `
    select count(*) as total ${baseSQL}
  `
  let sql = `
    SELECT * ${baseSQL}
    ${orderByString}
    LIMIT ${limit}
    OFFSET ${offset}
    `
    return {query: sql, countQuery: countSQL, params: filterParams}
}

export async function genericSelectTop(conn, table, offset, limit, orderBy, filters, executor){
  const { query, countQuery, params } = buildSelectTopQuery(table, offset, limit, orderBy, filters)

  const countResults = await executor(conn, { query: countQuery, params })
  const result = await executor(conn, { query, params })
  console.log({ countResults, result })
  const rowWithTotal = countResults.data.find((row) => { return row.total })
  const totalRecords = rowWithTotal ? rowWithTotal.total : 0
  return {
    result: result.data,
    totalRecords
  }
}
