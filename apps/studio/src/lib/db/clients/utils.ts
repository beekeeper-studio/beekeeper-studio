// Copyright (c) 2015 The SQLECTRON Team
import _ from 'lodash'
import logRaw from '@bksLogger'
import { TableChanges, TableDelete, TableFilter, TableInsert, TableUpdate, BuildInsertOptions } from '../models'
import { joinFilters } from '@/common/utils'
import { IdentifyResult } from 'sql-query-identifier/lib/defines'
import { fromIni } from "@aws-sdk/credential-providers";
import { Signer } from "@aws-sdk/rds-signer";
import globals from "@/common/globals";
import {
  AWSCredentials
} from "@/lib/db/authentication/amazon-redshift";
import { IamAuthOptions, IamAuthType, IDbConnectionServerConfig } from "@/lib/db/types";
import { AuthOptions } from "@/lib/db/authentication/azure";
import { spawn } from "child_process";
import { loadSharedConfigFiles } from "@aws-sdk/shared-ini-file-loader";
import { AwsCredentialIdentity, RuntimeConfigAwsCredentialIdentityProvider } from '@aws-sdk/types'

const log = logRaw.scope('db/util')

export class ClientError extends Error {
  helpLink = null
  constructor(message: string, helpLink: string) {
    super(message)
    this.helpLink = helpLink
  }
}

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

export function buildDatabaseFilter(filter, databaseField) {
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

export function getEntraOptions(server, extra): AuthOptions {
  return {
    password: server.config?.password,
    userName: server.config?.user,
    tenantId: server.config?.azureAuthOptions.tenantId,
    clientId: server.config?.azureAuthOptions.clientId,
    clientSecret: server.config?.azureAuthOptions.clientSecret,
    msiEndpoint: server.config?.azureAuthOptions.msiEndpoint,
    cliPath: server.config?.azureAuthOptions.cliPath,
    ...extra
  };
}

export function buildFilterString(filters: TableFilter[], columns = []) {
  let filterString = ""
  let filterParams = []
  if (filters && _.isArray(filters) && filters.length > 0) {
    const allFilters = filters.map((item) => {
      const column = columns.find((c) => c.columnName === item.field)
      const field = column?.dataType.toUpperCase().includes('BINARY') ?
        `HEX(${wrapIdentifier(item.field)})` :
        wrapIdentifier(item.field);

      if (item.type === 'in') {
        const questionMarks = _.isArray(item.value) ?
          item.value.map(() => '?').join(',')
          : '?'

        return `${field} ${item.type.toUpperCase()} (${questionMarks})`
      } else if (item.type.includes('is')) {
        return `${field} ${item.type.toUpperCase()} NULL`
      }
      return `${field} ${item.type.toUpperCase()} ?`
    })
    filterString = "WHERE " + joinFilters(allFilters, filters)

    log.info('FILTER: ', filterString)

    filterParams = filters.filter((item) => !!item.value).flatMap((item) => {
      return _.isArray(item.value) ? item.value : [item.value]
    })
  }
  return {
    filterString, filterParams
  }
}

export function applyChangesSql(changes: TableChanges, knex: any): string {
  const queries = [
    ...buildInsertQueries(knex, changes.inserts || []),
    ...buildUpdateQueries(knex, changes.updates || []),
    ...buildDeleteQueries(knex, changes.deletes || [])
  ].filter((i) => !!i && _.isString(i)).join(';')

  if (queries.length)
    return queries.endsWith(';') ? queries : `${queries};`
}

export function buildSelectTopQuery(table, offset, limit, orderBy, filters, countTitle = 'total', columns = [], selects = ['*']) {
  log.debug('building selectTop for', table, offset, limit, orderBy, selects)
  let orderByString = ""

  if (orderBy && orderBy.length > 0) {
    orderByString = "ORDER BY " + (orderBy.map((item: any) => {
      if (_.isObject(item)) {
        return `\`${item['field']}\` ${item['dir'].toUpperCase()}`
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

  const selectSQL = `SELECT ${selects.map((s) => wrapIdentifier(s)).join(", ")}`
  const baseSQL = `
    FROM \`${table}\`
    ${filterString}
  `
  const countSQL = `
    select count(*) as ${countTitle} ${baseSQL}
  `
  const sql = `
    ${selectSQL} ${baseSQL}
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

export async function genericSelectTop(conn, table, offset, limit, orderBy, filters, executor, selects){
  const queries = buildSelectTopQuery(table, offset, limit, orderBy, filters, undefined, undefined, selects)
  return await executeSelectTop(queries, conn, executor)
}

export function buildInsertQuery(knex, insert: TableInsert, { columns = [], bitConversionFunc = _.toNumber, runAsUpsert = false, primaryKeys = [] as string[], createUpsertFunc = null }: BuildInsertOptions = {}) {
  const data = _.cloneDeep(insert.data)
  const canRunAsUpsert = _.intersection(Object.keys(data[0]), primaryKeys).length === primaryKeys.length && runAsUpsert
  data.forEach((item) => {
    const insertColumns = Object.keys(item)
    insertColumns.forEach((ic) => {
      const matching = _.find(columns, (c) => c.columnName === ic)
      if (matching && matching.dataType && matching.dataType.startsWith('bit(') && !_.isNil(item[ic])) {
        if (matching.dataType === 'bit(1)') {
          item[ic] = bitConversionFunc(item[ic])
        } else {
          item[ic] = parseInt(item[ic].split("'")[1], 2)
        }
      } else if (matching && matching.dataType && matching.dataType.startsWith('bit') && _.isBoolean(item[ic])) {
        item[ic] = item[ic] ? 1 : 0;
      }
      // HACK (@day): fixes #1734. Knex reads any '?' in identifiers as a parameter, so we need to escape any that appear.
      if (ic.includes('?')) {
        const newIc = ic.replaceAll('?', '\\?');
        item[newIc] = item[ic];
        delete item[ic];
      }
    })

  })

  const table = insert.dataset ? `${insert.dataset}.${insert.table}` : insert.table;
  const builder = knex(table);

  if (insert.schema) {
    builder.withSchema(insert.schema)
  }

  if (canRunAsUpsert && typeof(createUpsertFunc) === 'function'){
    return createUpsertFunc({ schema: insert.schema, name: insert.table, entityType: 'table' }, data, primaryKeys)
  } else if (canRunAsUpsert) {
    // https://knexjs.org/guide/query-builder.html#onconflict
    return builder
      .insert(data)
      .onConflict(primaryKeys)
      .merge()
      .toQuery()
  }

  return builder
    .insert(data)
    .toQuery()
}

export function buildInsertQueries(knex, inserts, { runAsUpsert = false, primaryKeys = [], createUpsertFunc = null } = {}) {
  if (!inserts) return []
  return inserts.map(insert => buildInsertQuery(knex, insert, { runAsUpsert, primaryKeys, createUpsertFunc }))
}

export function buildUpdateQueries(knex, updates: TableUpdate[]) {
  if (!updates) return []

  return updates.map(update => {
    const where = {}
    const updateblob = {}
    update.primaryKeys.forEach(({column, value}) => {
      where[column] = value
    })

    // HACK (@day): fixes #1734. Knex reads any '?' in identifiers as a parameter, so we need to escape any that appear.
    if (update.column.includes('?')) {
      update.column = update.column.replaceAll('?', '\\?');
    }

    updateblob[update.column] = update.value

    const table = update.dataset ? `${update.dataset}.${update.table}` : update.table;
    const query = knex(table)
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

    const table = update.dataset ? `${update.dataset}.${update.table}` : update.table;

    const query = knex(table)
      .withSchema(update.schema)
      .where(where)
      .select('*')
      .toQuery()
    return query
  })
}

interface Releasable {
  release: () => Promise<any>
}

export async function withReleasable<T>(item: Releasable, func: (x: Releasable) => Promise<T>) {
  try {
    return await func(item)
  } finally {
    if (item) {
      await item.release()
    }
  }
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
  if (!deletes) return []
  return deletes.map(deleteRow => {
    const where = {}

    deleteRow.primaryKeys.forEach(({ column, value }) => {
      where[column] = value
    })

    const table = deleteRow.dataset ? `${deleteRow.dataset}.${deleteRow.table}` : deleteRow.table;

    return knex(table)
      .withSchema(deleteRow.schema)
      .where(where)
      .delete()
      .toQuery()
  })
}

export function isAllowedReadOnlyQuery (identifiedQueries: IdentifyResult[], readOnlyMode: boolean): boolean {
  return (!readOnlyMode || readOnlyMode && identifiedQueries.every(f => ['LISTING', 'INFORMATION'].includes(f.executionType?.toUpperCase())))
}

export const errorMessages = {
  readOnly: 'Write action(s) not allowed in Read-Only Mode.',
  maxReservedConnections: 'You have reserved the max connections available for manual transactions. Stop one of your active transactions to start a new one.'
}

export async function resolveAWSCredentials(iamOptions: IamAuthOptions): Promise<AWSCredentials> {
  if (iamOptions.accessKeyId && iamOptions.secretAccessKey) {
    return {
      accessKeyId: iamOptions.accessKeyId,
      secretAccessKey: iamOptions.secretAccessKey,
    };
  }

  // Fallback to AWS profile-based credentials
  const provider = fromIni({
    profile: iamOptions.awsProfile || "default",
  });
  return provider();
}

export async function getIAMPassword(iamOptions: IamAuthOptions, hostname: string, port: number, username: string): Promise<string> {
  const {
    awsProfile,
    accessKeyId,
    secretAccessKey,
    authType
  } = iamOptions;

  let { awsRegion: region } = iamOptions;

  let credentials: AwsCredentialIdentity | RuntimeConfigAwsCredentialIdentityProvider;

  if (authType === IamAuthType.Key) {
    credentials = {
      accessKeyId,
      secretAccessKey,
    }
  } else {
    const profileCreds = { profile: awsProfile || "default" };
    credentials = fromIni(profileCreds);
  }

  if (!region) {
    const { configFile } = await loadSharedConfigFiles();
    region = configFile[awsProfile || "default"]?.region;
    if (!region) {
      throw new Error(`Region not found in profile "${awsProfile}" and no region explicitly provided.`);
    }
  }

  const signer = new Signer({
    credentials,
    hostname,
    region,
    port,
    username,
  });

  return  await signer.getAuthToken();
}

export async function refreshTokenIfNeeded(iamOptions: IamAuthOptions, server: any, port: number): Promise<string> {
  if(!iamOptions?.iamAuthenticationEnabled){
    return null
  }

  let resolvedPw: string = null;

  if (iamOptions?.authType === IamAuthType.CLI) {
    resolvedPw = await getAWSCLIToken(
      server.config,
      iamOptions
    );
  } else {
    // TODO (@day): why are we passing in the port like this?!?
    resolvedPw = await getIAMPassword(
      iamOptions,
      server.config.host,
      server.config.port || port,
      server.config.user
    );
  }

  return resolvedPw;
}

export async function getAWSCLIToken(server: IDbConnectionServerConfig, options: IamAuthOptions): Promise<string> {
  if (!options?.cliPath) {
    throw new Error('AZ command not specified');
  }

  const extraArgs = []

  if(options.awsProfile){
    extraArgs.push('--profile', options.awsProfile)
  }

  return new Promise<string>((resolve, reject) => {
    const proc = spawn(options.cliPath, [
      'rds',
      'generate-db-auth-token',
      '--hostname',
      server.host,
      '--port',
      server.port.toString(),
      '--region',
      options.awsRegion,
      '--username',
      server.user,
      ...extraArgs
    ]);

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    proc.on('error', (err) => {
      reject(err);
    });

    proc.on('close', (code) => {
      if (code === 0) {
        try {
          resolve(stdout.trim());
        } catch (err) {
          reject(`Failed to parse token JSON: ${err}\nRaw output: ${stdout}`);
        }
      } else {
        reject(`Process exited with code ${code}\nSTDERR: ${stderr}\nSTDOUT: ${stdout}`);
      }
    });
  });
}

